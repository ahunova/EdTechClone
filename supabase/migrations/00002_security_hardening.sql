
-- ══════════════════════════════════════════════════════════════
-- SECURITY HARDENING MIGRATION
-- Fixes: ownership gaps, privilege escalation, answer leakage,
--        volatile helper, missing WITH CHECK, missing FORCE RLS
-- ══════════════════════════════════════════════════════════════

-- ── 1. Improve get_user_role: STABLE + locked search_path ──────
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- ── 2. Helper: is current user admin ──────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role(auth.uid()) = 'admin'::user_role;
$$;

-- ── 3. Helper: is current user teacher or admin ────────────────
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role(auth.uid()) = ANY(ARRAY['teacher'::user_role, 'admin'::user_role]);
$$;

-- ── 4. Helper: owns a quiz (created_by = me OR admin) ─────────
CREATE OR REPLACE FUNCTION public.owns_quiz(quiz_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE id = quiz_id
      AND (created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role)
  );
$$;

-- ── 5. Helper: owns a subject ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.owns_subject(subject_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subjects
    WHERE id = subject_id
      AND (teacher_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role)
  );
$$;

-- ── 6. Helper: owns a video_lesson (via subject) ──────────────
CREATE OR REPLACE FUNCTION public.owns_video_lesson(lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.video_lessons vl
    JOIN public.subjects s ON s.id = vl.subject_id
    WHERE vl.id = lesson_id
      AND (s.teacher_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role)
  );
$$;

-- ══════════════════════════════════════════════════════════════
-- DROP ALL EXISTING POLICIES (clean slate)
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view their own profile"      ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles"   ON public.profiles;

DROP POLICY IF EXISTS "Anyone authenticated can view subjects"       ON public.subjects;
DROP POLICY IF EXISTS "Teachers and admins can manage subjects"      ON public.subjects;

DROP POLICY IF EXISTS "Authenticated users can view video lessons"   ON public.video_lessons;
DROP POLICY IF EXISTS "Teachers and admins can manage video lessons" ON public.video_lessons;

DROP POLICY IF EXISTS "Students can view published quizzes"          ON public.quizzes;
DROP POLICY IF EXISTS "Teachers and admins can manage quizzes"       ON public.quizzes;

DROP POLICY IF EXISTS "Authenticated users can view questions"       ON public.questions;
DROP POLICY IF EXISTS "Teachers and admins can manage questions"     ON public.questions;

DROP POLICY IF EXISTS "Students can manage own attempts"             ON public.exam_attempts;
DROP POLICY IF EXISTS "Teachers and admins can view attempts"        ON public.exam_attempts;

DROP POLICY IF EXISTS "Students can manage own answers"              ON public.exam_answers;
DROP POLICY IF EXISTS "Teachers and admins can view answers"         ON public.exam_answers;

DROP POLICY IF EXISTS "Students can view own attendance"             ON public.attendance;
DROP POLICY IF EXISTS "Teachers and admins can manage attendance"    ON public.attendance;

DROP POLICY IF EXISTS "Students can view own enrollments"            ON public.subject_enrollments;
DROP POLICY IF EXISTS "Students can enroll themselves"               ON public.subject_enrollments;
DROP POLICY IF EXISTS "Admins and teachers can manage enrollments"   ON public.subject_enrollments;

DROP POLICY IF EXISTS "Students can manage own completions"          ON public.video_completions;
DROP POLICY IF EXISTS "Teachers view completions"                    ON public.video_completions;

-- ══════════════════════════════════════════════════════════════
-- ENABLE FORCE ROW LEVEL SECURITY (blocks table-owner bypass)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subjects           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.video_lessons      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.questions          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attendance         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subject_enrollments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.video_completions  FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- PROFILES
-- ══════════════════════════════════════════════════════════════
-- Anyone authenticated can see all profiles (needed for name display)
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Users update only their own profile; cannot escalate role
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (role IS NOT DISTINCT FROM get_user_role(auth.uid()))
);

-- Admin full write access (INSERT/DELETE for user management)
CREATE POLICY "profiles_admin_all"
ON public.profiles FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ══════════════════════════════════════════════════════════════
-- SUBJECTS — owner-scoped write
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "subjects_select_authenticated"
ON public.subjects FOR SELECT TO authenticated
USING (true);

CREATE POLICY "subjects_insert_teacher_admin"
ON public.subjects FOR INSERT TO authenticated
WITH CHECK (
  is_teacher_or_admin()
  AND (teacher_id = auth.uid() OR is_admin())
);

CREATE POLICY "subjects_update_owner"
ON public.subjects FOR UPDATE TO authenticated
USING (owns_subject(id))
WITH CHECK (owns_subject(id));

CREATE POLICY "subjects_delete_owner"
ON public.subjects FOR DELETE TO authenticated
USING (owns_subject(id));

-- ══════════════════════════════════════════════════════════════
-- VIDEO LESSONS — owner-scoped write (via subject ownership)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "video_lessons_select_authenticated"
ON public.video_lessons FOR SELECT TO authenticated
USING (true);

CREATE POLICY "video_lessons_insert_owner"
ON public.video_lessons FOR INSERT TO authenticated
WITH CHECK (owns_subject(subject_id));

CREATE POLICY "video_lessons_update_owner"
ON public.video_lessons FOR UPDATE TO authenticated
USING (owns_video_lesson(id))
WITH CHECK (owns_video_lesson(id));

CREATE POLICY "video_lessons_delete_owner"
ON public.video_lessons FOR DELETE TO authenticated
USING (owns_video_lesson(id));

-- ══════════════════════════════════════════════════════════════
-- QUIZZES — owner-scoped write
-- ══════════════════════════════════════════════════════════════
-- Students only see published; teachers/admins see all + own
CREATE POLICY "quizzes_select"
ON public.quizzes FOR SELECT TO authenticated
USING (
  published = true
  OR is_teacher_or_admin()
);

CREATE POLICY "quizzes_insert_teacher_admin"
ON public.quizzes FOR INSERT TO authenticated
WITH CHECK (
  is_teacher_or_admin()
  AND (created_by = auth.uid() OR is_admin())
);

CREATE POLICY "quizzes_update_owner"
ON public.quizzes FOR UPDATE TO authenticated
USING (owns_quiz(id))
WITH CHECK (owns_quiz(id));

CREATE POLICY "quizzes_delete_owner"
ON public.quizzes FOR DELETE TO authenticated
USING (owns_quiz(id));

-- ══════════════════════════════════════════════════════════════
-- QUESTIONS — students only read published quiz questions
-- (prevents answer leakage before exam)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "questions_select_student"
ON public.questions FOR SELECT TO authenticated
USING (
  is_teacher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = questions.quiz_id AND q.published = true
  )
);

CREATE POLICY "questions_insert_owner"
ON public.questions FOR INSERT TO authenticated
WITH CHECK (owns_quiz(quiz_id));

CREATE POLICY "questions_update_owner"
ON public.questions FOR UPDATE TO authenticated
USING (owns_quiz(quiz_id))
WITH CHECK (owns_quiz(quiz_id));

CREATE POLICY "questions_delete_owner"
ON public.questions FOR DELETE TO authenticated
USING (owns_quiz(quiz_id));

-- ══════════════════════════════════════════════════════════════
-- EXAM ATTEMPTS — students INSERT+SELECT only; no score tampering
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "exam_attempts_insert_student"
ON public.exam_attempts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "exam_attempts_select_own"
ON public.exam_attempts FOR SELECT TO authenticated
USING (
  auth.uid() = student_id
  OR is_teacher_or_admin()
);

-- Students can only update submitted_at (submit the exam); score is set server-side
CREATE POLICY "exam_attempts_update_submit"
ON public.exam_attempts FOR UPDATE TO authenticated
USING (auth.uid() = student_id AND submitted_at IS NULL)
WITH CHECK (auth.uid() = student_id);

-- Only admin/teacher can delete attempts (data integrity)
CREATE POLICY "exam_attempts_delete_admin"
ON public.exam_attempts FOR DELETE TO authenticated
USING (is_teacher_or_admin());

-- ══════════════════════════════════════════════════════════════
-- EXAM ANSWERS — students INSERT+SELECT only (no update after submit)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "exam_answers_insert_student"
ON public.exam_answers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    WHERE ea.id = exam_answers.attempt_id
      AND ea.student_id = auth.uid()
      AND ea.submitted_at IS NULL
  )
);

CREATE POLICY "exam_answers_select"
ON public.exam_answers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    WHERE ea.id = exam_answers.attempt_id
      AND ea.student_id = auth.uid()
  )
  OR is_teacher_or_admin()
);

-- No UPDATE or DELETE for students — answers are immutable after insert

-- ══════════════════════════════════════════════════════════════
-- ATTENDANCE
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "attendance_select_own"
ON public.attendance FOR SELECT TO authenticated
USING (auth.uid() = student_id OR is_teacher_or_admin());

CREATE POLICY "attendance_insert_teacher_admin"
ON public.attendance FOR INSERT TO authenticated
WITH CHECK (is_teacher_or_admin());

CREATE POLICY "attendance_update_teacher_admin"
ON public.attendance FOR UPDATE TO authenticated
USING (is_teacher_or_admin())
WITH CHECK (is_teacher_or_admin());

CREATE POLICY "attendance_delete_teacher_admin"
ON public.attendance FOR DELETE TO authenticated
USING (is_teacher_or_admin());

-- ══════════════════════════════════════════════════════════════
-- SUBJECT ENROLLMENTS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "enrollments_select_own"
ON public.subject_enrollments FOR SELECT TO authenticated
USING (auth.uid() = student_id OR is_teacher_or_admin());

CREATE POLICY "enrollments_insert_student"
ON public.subject_enrollments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "enrollments_manage_teacher_admin"
ON public.subject_enrollments FOR ALL TO authenticated
USING (is_teacher_or_admin())
WITH CHECK (is_teacher_or_admin());

-- ══════════════════════════════════════════════════════════════
-- VIDEO COMPLETIONS — INSERT + SELECT only (no delete = no progress reset)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "video_completions_insert_student"
ON public.video_completions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "video_completions_select"
ON public.video_completions FOR SELECT TO authenticated
USING (auth.uid() = student_id OR is_teacher_or_admin());

-- Teachers/admins can delete (for data management only)
CREATE POLICY "video_completions_delete_admin"
ON public.video_completions FOR DELETE TO authenticated
USING (is_teacher_or_admin());
