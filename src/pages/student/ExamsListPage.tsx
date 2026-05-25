import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ArrowRight, Clock, Play, Trophy } from 'lucide-react';
import type { Quiz, ExamAttempt } from '@/types/types';

export default function ExamsListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      setLoading(true);
      const [qRes, aRes] = await Promise.all([
        supabase.from('quizzes').select('*, subjects(name)').eq('published', true).order('created_at', { ascending: false }),
        supabase.from('exam_attempts').select('id, student_id, quiz_id, started_at, score, total_questions, submitted_at, time_spent_seconds').eq('student_id', profile.id).not('submitted_at', 'is', null),
      ]);
      setQuizzes(Array.isArray(qRes.data) ? qRes.data : []);
      setAttempts(Array.isArray(aRes.data) ? aRes.data : []);
      setLoading(false);
    };
    fetchData();
  }, [profile?.id]);

  const getAttempt = (quizId: string) => attempts.find(a => a.quiz_id === quizId);

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground text-balance">Imtihonlar</h1>
          <p className="text-sm text-muted-foreground mt-1">Mavjud testlar va natijalar</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-36 bg-muted" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Hozircha testlar mavjud emas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map(quiz => {
              const attempt = getAttempt(quiz.id);
              const pct = attempt ? Math.round(((attempt.score ?? 0) / Math.max(attempt.total_questions, 1)) * 100) : null;
              return (
                <Card key={quiz.id} className="h-full shadow-card hover:shadow-hover transition-shadow flex flex-col">
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-balance">{quiz.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{(quiz as any).subjects?.name}</p>
                      </div>
                      {pct !== null && (
                        <Badge variant={pct >= 55 ? 'default' : 'destructive'} className="shrink-0">
                          {pct}%
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {quiz.duration_minutes} daqiqa
                      </span>
                      {attempt && (
                        <span className="flex items-center gap-1 text-success">
                          <Trophy className="w-3 h-3" />
                          {attempt.score}/{attempt.total_questions} to'g'ri
                        </span>
                      )}
                    </div>

                    <div className="mt-auto">
                      <Button
                        className="w-full h-9"
                        variant={attempt ? 'outline' : 'default'}
                        onClick={() => navigate(attempt ? `/exams/result/${(attempts.find(a => a.quiz_id === quiz.id) as any)?.id ?? ''}` : `/exams/${quiz.id}`)}
                      >
                        {attempt ? (
                          <><Trophy className="w-4 h-4 mr-2" />Natijani ko'rish</>
                        ) : (
                          <><Play className="w-4 h-4 mr-2" />Boshlash</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
