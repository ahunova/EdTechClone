import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Trophy, Clock, ArrowRight, RotateCcw } from 'lucide-react';
import type { ExamAttempt, ExamAnswer, Question } from '@/types/types';

interface AttemptWithQuiz extends ExamAttempt {
  quizzes?: { title: string; duration_minutes: number };
}

interface AnswerWithQuestion extends ExamAnswer {
  questions?: Question;
}

export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<AttemptWithQuiz | null>(null);
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!attemptId) return;
      setLoading(true);

      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('*, quizzes(title, duration_minutes)')
        .eq('id', attemptId)
        .maybeSingle();
      setAttempt(attemptData);

      const { data: answersData } = await supabase
        .from('exam_answers')
        .select('*, questions(*)')
        .eq('attempt_id', attemptId)
        .order('questions(question_order)');
      setAnswers(Array.isArray(answersData) ? answersData : []);
      setLoading(false);
    };
    fetchData();
  }, [attemptId]);

  const score = attempt?.score ?? 0;
  const total = attempt?.total_questions ?? 1;
  const pct = Math.round((score / total) * 100);
  const timeSpent = attempt?.time_spent_seconds ?? 0;
  const mins = Math.floor(timeSpent / 60);
  const secs = timeSpent % 60;

  const getGrade = (p: number) => {
    if (p >= 90) return { label: "A'lo", color: 'text-success', bg: 'bg-success/10' };
    if (p >= 75) return { label: 'Yaxshi', color: 'text-primary', bg: 'bg-primary/10' };
    if (p >= 55) return { label: "Qoniqarli", color: 'text-warning', bg: 'bg-warning/10' };
    return { label: "Qoniqarsiz", color: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const grade = getGrade(pct);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-48 bg-muted" />
          <Skeleton className="h-64 bg-muted" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        {/* Score card */}
        <Card className="shadow-card overflow-hidden">
          <div className="bg-primary px-6 pt-6 pb-10 text-primary-foreground text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-90" />
            <h1 className="text-2xl font-bold text-balance">Natijalar</h1>
            <p className="text-primary-foreground/80 text-sm mt-1 text-pretty">
              {attempt?.quizzes?.title ?? 'Imtihon'}
            </p>
          </div>
          <div className="-mt-6 mx-4 mb-4">
            <Card className="shadow-hover">
              <CardContent className="p-5">
                {/* Big score */}
                <div className="text-center mb-5">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${grade.bg} ${grade.color} mb-2`}>
                    {pct}%
                  </div>
                  <p className={`text-lg font-semibold ${grade.color}`}>{grade.label}</p>
                </div>

                <Progress value={pct} className="h-3 mb-4" />

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-success/10">
                    <p className="text-xl font-bold text-success">{score}</p>
                    <p className="text-xs text-muted-foreground">To'g'ri</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <p className="text-xl font-bold text-destructive">{total - score}</p>
                    <p className="text-xs text-muted-foreground">Noto'g'ri</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xl font-bold text-foreground">{total}</p>
                    <p className="text-xs text-muted-foreground">Jami</p>
                  </div>
                </div>

                {timeSpent > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Sarflangan vaqt: {mins}:{String(secs).padStart(2, '0')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-11"
            onClick={() => setShowReview(!showReview)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {showReview ? "Yashirish" : "Ko'rib chiqish"}
          </Button>
          <Button className="flex-1 h-11" onClick={() => navigate('/exams')}>
            Imtihonlar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Answer review */}
        {showReview && (
          <div className="space-y-3 animate-fade-in">
            <h2 className="text-base font-semibold text-foreground">Javoblar tahlili</h2>
            {answers.map((ans, idx) => {
              const q = ans.questions;
              if (!q) return null;
              const correct = ans.is_correct;
              const optKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
              return (
                <Card key={ans.id} className={`shadow-card border ${correct ? 'border-success/30' : 'border-destructive/30'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${correct ? 'bg-success/20' : 'bg-destructive/20'}`}>
                        {correct
                          ? <CheckCircle className="w-4 h-4 text-success" />
                          : <XCircle className="w-4 h-4 text-destructive" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground text-pretty">
                          {idx + 1}. {q.question_text}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5 ml-10">
                      {optKeys.map(key => {
                        const optText = q[`option_${key.toLowerCase()}` as keyof Question] as string;
                        const isCorrectOpt = key === q.correct_option;
                        const isSelected = key === ans.selected_option;
                        return (
                          <div
                            key={key}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                              ${isCorrectOpt ? 'bg-success/15 border border-success/30 text-success font-medium'
                                : isSelected && !isCorrectOpt ? 'bg-destructive/15 border border-destructive/30 text-destructive'
                                : 'text-muted-foreground'}`}
                          >
                            <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center shrink-0
                              ${isCorrectOpt ? 'bg-success text-white'
                                : isSelected ? 'bg-destructive text-white'
                                : 'bg-muted'}`}>
                              {key}
                            </span>
                            <span className="flex-1">{optText}</span>
                            {isCorrectOpt && <CheckCircle className="w-4 h-4 shrink-0" />}
                            {isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 shrink-0" />}
                          </div>
                        );
                      })}
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
