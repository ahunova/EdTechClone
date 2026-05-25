import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookMarked, ClipboardList, BarChart3, Users, ArrowRight, TrendingUp, CheckCircle } from 'lucide-react';
import type { Subject, Quiz } from '@/types/types';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      setLoading(true);

      const [subRes, quizRes, stuRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('teacher_id', profile.id).limit(6),
        supabase.from('quizzes').select('*').eq('created_by', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      ]);

      const subList = Array.isArray(subRes.data) ? subRes.data : [];
      setSubjects(subList);
      setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : []);
      setStudentCount(stuRes.count ?? 0);

      // Count attempts for teacher's quizzes
      if (subList.length > 0) {
        const quizIds = (Array.isArray(quizRes.data) ? quizRes.data : []).map(q => q.id);
        if (quizIds.length > 0) {
          const { count } = await supabase
            .from('exam_attempts')
            .select('id', { count: 'exact', head: true })
            .in('quiz_id', quizIds)
            .not('submitted_at', 'is', null);
          setAttemptCount(count ?? 0);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [profile?.id]);

  const stats = [
    { label: 'Fanlarim', value: subjects.length, icon: BookMarked, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Testlar', value: quizzes.length, icon: ClipboardList, color: 'text-info', bg: 'bg-info/10' },
    { label: "O'quvchilar", value: studentCount, icon: Users, color: 'text-success', bg: 'bg-success/10' },
    { label: "Topshirishlar", value: attemptCount, icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground text-balance">
            Xush kelibsiz, {profile?.full_name?.split(' ')[0] ?? "O'qituvchi"}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">O'qituvchi boshqaruv paneli</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(stat => (
            <Card key={stat.label} className="h-full shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {loading ? '—' : stat.value}
                    </p>
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
              <CardTitle className="text-base text-balance">Fanlarim</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/subjects')} className="shrink-0 text-primary h-8 px-2">
                Barchasi <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 bg-muted" />)}</div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-6">
                  <BookMarked className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Fan qo'shilmagan</p>
                  <Button size="sm" className="mt-3" onClick={() => navigate('/teacher/subjects')}>
                    Fan qo'shish
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {subjects.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.description || 'Fan'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent quizzes */}
          <Card className="h-full shadow-card flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base text-balance">So'nggi testlar</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/quiz-builder')} className="shrink-0 text-primary h-8 px-2">
                Yaratish <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 bg-muted" />)}</div>
              ) : quizzes.length === 0 ? (
                <div className="text-center py-6">
                  <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Test yaratilmagan</p>
                  <Button size="sm" className="mt-3" onClick={() => navigate('/teacher/quiz-builder')}>
                    Test yaratish
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {quizzes.map(q => (
                    <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{q.title}</p>
                        <p className="text-xs text-muted-foreground">{q.duration_minutes} daqiqa</p>
                      </div>
                      <Badge variant={q.published ? 'default' : 'secondary'} className="shrink-0 text-xs">
                        {q.published ? <><CheckCircle className="w-3 h-3 mr-1" />Faol</> : 'Qoralama'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Fan qo'shish", desc: 'Yangi fan yaratish', icon: BookMarked, path: '/teacher/subjects' },
            { label: 'Test yaratish', desc: "Yangi test va savollar qo'shish", icon: ClipboardList, path: '/teacher/quiz-builder' },
            { label: "Tahlil ko'rish", desc: "O'quvchilar natijalarini tahlil qilish", icon: BarChart3, path: '/teacher/analytics' },
          ].map(a => (
            <Card key={a.label} className="shadow-card hover:shadow-hover transition-shadow cursor-pointer" onClick={() => navigate(a.path)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <a.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{a.label}</p>
                  <p className="text-xs text-muted-foreground text-pretty">{a.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
