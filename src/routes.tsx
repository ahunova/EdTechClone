import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import VideoLessonPage from './pages/student/VideoLessonPage';
import ExamsListPage from './pages/student/ExamsListPage';
import ExamPage from './pages/student/ExamPage';
import ResultPage from './pages/student/ResultPage';
import StudentProfile from './pages/student/StudentProfile';
import AIAdvisorPage from './pages/student/AIAdvisorPage';

// Teacher pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import SubjectManagementPage from './pages/teacher/SubjectManagementPage';
import QuizBuilderPage from './pages/teacher/QuizBuilderPage';
import AnalyticsDashboard from './pages/teacher/AnalyticsDashboard';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  // Redirect root to login
  { name: 'Root', path: '/', element: <Navigate to="/login" replace />, public: true },

  // Auth
  { name: 'Kirish', path: '/login', element: <LoginPage />, public: true },
  { name: "Ro'yxatdan o'tish", path: '/register', element: <RegisterPage />, public: true },

  // Student
  { name: 'Bosh sahifa', path: '/dashboard', element: <StudentDashboard /> },
  { name: 'Video darslar', path: '/lessons', element: <VideoLessonPage /> },
  { name: 'Video darslar (fan)', path: '/lessons/:subjectId', element: <VideoLessonPage /> },
  { name: 'Imtihonlar', path: '/exams', element: <ExamsListPage /> },
  { name: 'Imtihon', path: '/exams/:quizId', element: <ExamPage /> },
  { name: 'Natija', path: '/exams/result/:attemptId', element: <ResultPage /> },
  { name: 'Profil', path: '/profile', element: <StudentProfile /> },
  { name: 'AI Maslahatchi', path: '/ai-advisor', element: <AIAdvisorPage /> },

  // Teacher
  { name: "O'qituvchi paneli", path: '/teacher/dashboard', element: <TeacherDashboard /> },
  { name: 'Fanlar', path: '/teacher/subjects', element: <SubjectManagementPage /> },
  { name: 'Test yaratish', path: '/teacher/quiz-builder', element: <QuizBuilderPage /> },
  { name: 'Tahlil', path: '/teacher/analytics', element: <AnalyticsDashboard /> },

  // Admin
  { name: 'Admin paneli', path: '/admin/dashboard', element: <AdminDashboard /> },
  { name: 'Admin foydalanuvchilar', path: '/admin/users', element: <AdminDashboard /> },
  { name: 'Admin fanlar', path: '/admin/subjects', element: <AdminDashboard /> },
  { name: 'Admin sozlamalar', path: '/admin/settings', element: <AdminDashboard /> },
];
