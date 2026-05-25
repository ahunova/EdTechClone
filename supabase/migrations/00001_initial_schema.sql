
-- Roles
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'admin');

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  email text,
  role user_role NOT NULL DEFAULT 'student',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Helper function for role checks
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

-- Profiles policies
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

CREATE VIEW public_profiles AS
  SELECT id, username, full_name, role, avatar_url FROM profiles;

-- Subjects table
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  color text NOT NULL DEFAULT '#4F46E5',
  icon text NOT NULL DEFAULT 'book',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view subjects" ON subjects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers and admins can manage subjects" ON subjects
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('teacher'::user_role, 'admin'::user_role));

-- Subject enrollments
CREATE TABLE public.subject_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id)
);

ALTER TABLE public.subject_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own enrollments" ON subject_enrollments
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Admins and teachers can manage enrollments" ON subject_enrollments
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin'::user_role, 'teacher'::user_role));

CREATE POLICY "Students can enroll themselves" ON subject_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Video lessons
CREATE TABLE public.video_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL,
  video_type text NOT NULL DEFAULT 'youtube' CHECK (video_type IN ('youtube', 'gdrive', 'other')),
  lesson_order integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view video lessons" ON video_lessons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers and admins can manage video lessons" ON video_lessons
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('teacher'::user_role, 'admin'::user_role));

-- Video completions
CREATE TABLE public.video_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

ALTER TABLE public.video_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own completions" ON video_completions
  FOR ALL TO authenticated USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers view completions" ON video_completions
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('teacher'::user_role, 'admin'::user_role));

-- Quizzes
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 30,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view published quizzes" ON quizzes
  FOR SELECT TO authenticated
  USING (published = true OR get_user_role(auth.uid()) IN ('teacher'::user_role, 'admin'::user_role));

CREATE POLICY "Teachers and admins can manage quizzes" ON quizzes
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('teacher'::user_role, 'admin'::user_role));

-- Questions
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  question_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view questions" ON questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers and admins can manage questions" ON questions
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('teacher'::user_role, 'admin'::user_role));

-- Exam attempts
CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score integer,
  total_questions integer NOT NULL DEFAULT 0,
  time_spent_seconds integer
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own attempts" ON exam_attempts
  FOR ALL TO authenticated USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can view attempts" ON exam_attempts
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('teacher'::user_role, 'admin'::user_role));

-- Exam answers
CREATE TABLE public.exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option text CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  is_correct boolean,
  UNIQUE(attempt_id, question_id)
);

ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own answers" ON exam_answers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.id = attempt_id AND ea.student_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM exam_attempts ea WHERE ea.id = attempt_id AND ea.student_id = auth.uid())
  );

CREATE POLICY "Teachers and admins can view answers" ON exam_answers
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('teacher'::user_role, 'admin'::user_role));

-- Attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own attendance" ON attendance
  FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can manage attendance" ON attendance
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('teacher'::user_role, 'admin'::user_role));
