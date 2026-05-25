-- ══════════════════════════════════════════════════════════════
-- DEMO DATA SEED
-- Run this AFTER both migrations are applied
-- Note: Auth users must be created via Edge Function or Supabase Auth Admin
-- ══════════════════════════════════════════════════════════════

-- Subjects (4 demo subjects)
INSERT INTO public.subjects (id, name, description, color, icon) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Matematika', 'Algebra, geometriya va analiz asoslari', '#4F46E5', 'calculator'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Fizika', 'Mexanika, elektrodinamika va optika', '#0EA5E9', 'atom'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Ingliz tili', 'Grammatika, lug''at va muloqot ko''nikmalari', '#10B981', 'languages'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Tarix', 'Jahon va O''zbekiston tarixi', '#F59E0B', 'landmark')
ON CONFLICT (id) DO NOTHING;

-- Demo quizzes (published)
INSERT INTO public.quizzes (id, subject_id, title, description, duration_minutes, published) VALUES
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Algebra asoslari', 'Birinchi darajali algebraik ifodalar', 20, true),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Mexanika testi', 'Harakat va kuch haqida savollar', 25, true)
ON CONFLICT (id) DO NOTHING;

-- Demo questions for quiz 1
INSERT INTO public.questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, question_order) VALUES
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'x + 3 = 7 bo''lsa, x nechaga teng?', '3', '4', '5', '7', 'B', 1),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '2y = 10 bo''lsa, y nechaga teng?', '4', '5', '6', '8', 'B', 2),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '3z + 2 = 14 bo''lsa, z nechaga teng?', '2', '3', '4', '5', 'C', 3),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'a - 5 = 3 bo''lsa, a nechaga teng?', '6', '7', '8', '9', 'C', 4);

-- Demo questions for quiz 2
INSERT INTO public.questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, question_order) VALUES
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'Bir jism tezligi 10 m/s. 5 sekundda qancha masofa bosib o''tadi?', '50 m', '40 m', '60 m', '25 m', 'A', 1),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'Gravitatsiya kuchini kim kashf etgan?', 'Niyuton', 'Eynstein', 'Galiley', 'Faraday', 'A', 2);

-- Demo video lessons
INSERT INTO public.video_lessons (subject_id, title, description, video_url, video_type, lesson_order, duration_minutes) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Algebra kirish', 'O''zgaruvchilar va ifodalar', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 1, 15),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tenglamalar', 'Chiziqli tenglamalarni yechish', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 2, 20),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Kuch va harakat', 'Niyuton qonunlari', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 1, 18);

-- Demo attendance records
INSERT INTO public.attendance (student_id, subject_id, date, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', CURRENT_DATE, 'present'),
  ('00000000-0000-0000-0000-000000000001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', CURRENT_DATE, 'present'),
  ('00000000-0000-0000-0000-000000000001', 'c3d4e5f6-a7b8-9012-cdef-123456789012', CURRENT_DATE - 1, 'late');
