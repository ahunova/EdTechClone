export type UserRole = 'student' | 'teacher' | 'admin';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  teacher_id: string | null;
  color: string;
  icon: string;
  created_at: string;
  teacher?: Profile;
}

export interface SubjectEnrollment {
  id: string;
  student_id: string;
  subject_id: string;
  enrolled_at: string;
  subject?: Subject;
}

export interface VideoLesson {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  video_url: string;
  video_type: 'youtube' | 'gdrive' | 'other';
  lesson_order: number;
  duration_minutes: number;
  created_at: string;
  completed?: boolean;
}

export interface Quiz {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  created_by: string | null;
  published: boolean;
  created_at: string;
  subject?: Subject;
  question_count?: number;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  question_order: number;
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  student_id: string;
  quiz_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_questions: number;
  time_spent_seconds: number | null;
  quiz?: Quiz;
  student?: Profile;
}

export interface ExamAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option: 'A' | 'B' | 'C' | 'D' | null;
  is_correct: boolean | null;
  question?: Question;
}

export interface Attendance {
  id: string;
  student_id: string;
  subject_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  created_at: string;
  subject?: Subject;
}
