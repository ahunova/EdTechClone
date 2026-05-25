import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen, ClipboardList, Trophy, TrendingUp,
  Play, ArrowRight, Calendar, Star
} from 'lucide-react';
import type { Subject, Quiz, ExamAttempt } from '@/types/types';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      setLoading(true);

      const [subjectsRes, quizzesRes, attemptsRes] = await Promise.all([
        supabase.from('subjects').select('*').limit(6),
        supabase.from('quizzes').select('*, subjects(name)').eq('published', true).limit(4),
        supabase
          .from('exam_attempts')
          .select('*, quizzes(title, duration_minutes)')
          .eq('student_id', profile.id)
          .not('submitted_at', 'is', null)
          .order('submitted_at', { ascending: false })
          .limit(5),
      ]);

      setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
      setQuizzes(Array.isArray(quizzesRes.data) ? quizzesRes.data : []);
      setAttempts(Array.isArray(attemptsRes.data) ? attemptsRes.data : []);
      setLoading(false);
    };
    fetchData();
  }, [profile?.id]);

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + ((a.score ?? 0) / Math.max(a.total_questions, 1)) * 100, 0) / attempts.length)
    : 0;

  const stats = [
    { label: "Fanlar", value: subjects.length, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
    { label: "Imtihonlar", value: attempts.length, icon: ClipboardList, color: 'text-success', bg: 'bg-success/10' },
    { label: "O'rtacha ball", value: `${avgScore}%`, icon: Trophy, color: 'text-warning', bg: 'bg-warning/10' },
    { label: "Progresss", value: `${Math.min(attempts.length * 10, 100)}%`, icon: TrendingUp, color: 'text-info', bg: 'bg-info/10' },
  ];

  const subjectColors = ['bg-primary/10 text-primary', 'bg-success/10 text-success', 'bg-warning/10 text-warning', 'bg-destructive/10 text-destructive'];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground text-balance">
            Xush kelibsiz, {profile?.full_name?.split(' ')[0] || "O'quvchi"}!
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-pretty">
            Bugungi ta'lim jarayoningizni kuzating
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="h-full shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{loading ? '—' : stat.value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.bg}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subjects */}
          <Card className="h-full shadow-card flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base text-balance">Fanlar</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/lessons')} className="shrink-0 text-primary h-8 px-2">
                Barchasi <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 bg-muted" />)}
                </div>
              ) : subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Fanlar mavjud emas</p>
              ) : (
                <div className="space-y-2">
                  {subjects.slice(0, 5).map((subject, idx) => (
                    <button
                      key={subject.id}
                      onClick={() => navigate('/lessons')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${subjectColors[idx % subjectColors.length]}`}>
                        {subject.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{subject.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{subject.description || 'Fan'}</p>
                      </div>
                      <Play className="w-3 h-3 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Attempts */}
          <Card className="h-full shadow-card flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base text-balance">So'nggi natijalar</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/exams')} className="shrink-0 text-primary h-8 px-2">
                Barchasi <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 bg-muted" />)}
                </div>
              ) : attempts.length === 0 ? (
                <div className="text-center py-6">
                  <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Hali imtihon topshirilmagan</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/exams')}>
                    Imtihon topshirish
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {attempts.map((attempt) => {
                    const pct = attempt.total_questions > 0 ? Math.round(((attempt.score ?? 0) / attempt.total_questions) * 100) : 0;
                    return (
                      <div key={attempt.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-foreground text-pretty flex-1 min-w-0">
                            {(attempt as any).quizzes?.title || 'Imtihon'}
                          </p>
                          <Badge variant={pct >= 70 ? 'default' : 'destructive'} className="shrink-0 text-xs">
                            {pct}%
                          </Badge>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <div className="flex items-center gap-1 mt-1.5">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString('uz-UZ') : '—'}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {attempt.score}/{attempt.total_questions} to'g'ri
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Quizzes */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-balance">Mavjud testlar</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-20 bg-muted" />)}
              </div>
            ) : quizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Testlar mavjud emas</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground">{quiz.duration_minutes} daqiqa</p>
                    </div>
                    <Button size="sm" className="shrink-0 h-8" onClick={() => navigate(`/exams/${quiz.id}`)}>{"Boshlash"}</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
