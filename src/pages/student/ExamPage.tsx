import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, ChevronLeft, ChevronRight, Send, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import type { Quiz, Question } from '@/types/types';

const OPTIONS: { key: 'A' | 'B' | 'C' | 'D'; label: string }[] = [
  { key: 'A', label: 'A' },
  { key: 'B', label: 'B' },
  { key: 'C', label: 'C' },
  { key: 'D', label: 'D' },
];

export default function ExamPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      if (!quizId || !profile?.id) return;
      setLoading(true);

      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .maybeSingle();
      if (!quizData) { toast.error("Test topilmadi"); navigate('/exams'); return; }
      setQuiz(quizData);
      setTimeLeft(quizData.duration_minutes * 60);

      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('question_order');
      const qList = Array.isArray(questionsData) ? questionsData : [];
      setQuestions(qList);

      // Create attempt
      const { data: attempt, error: attemptErr } = await supabase
        .from('exam_attempts')
        .insert({ student_id: profile.id, quiz_id: quizId, total_questions: qList.length })
        .select()
        .maybeSingle();
      if (attemptErr || !attempt) { toast.error("Imtihon boshlanmadi"); navigate('/exams'); return; }
      setAttemptId(attempt.id);
      startTimeRef.current = new Date();
      setLoading(false);
    };
    fetchData();
  }, [quizId, profile?.id]);

  // Timer
  useEffect(() => {
    if (loading || !attemptId) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, attemptId]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (!attemptId || !profile?.id || submitting) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    if (auto) toast.info("Vaqt tugadi! Imtihon avtomatik topshirildi.");

    // Calculate score
    let score = 0;
    const answerRows = questions.map(q => {
      const sel = answers[q.id] ?? null;
      const correct = sel === q.correct_option;
      if (correct) score++;
      return {
        attempt_id: attemptId,
        question_id: q.id,
        selected_option: sel,
        is_correct: correct,
      };
    });

    const elapsed = Math.round((new Date().getTime() - startTimeRef.current.getTime()) / 1000);

    // Save answers
    if (answerRows.length > 0) {
      await supabase.from('exam_answers').insert(answerRows);
    }

    // Update attempt
    await supabase.from('exam_attempts').update({
      submitted_at: new Date().toISOString(),
      score,
      time_spent_seconds: elapsed,
    }).eq('id', attemptId);

    navigate(`/exams/result/${attemptId}`);
  }, [attemptId, questions, answers, profile?.id, submitting, navigate]);

  const currentQ = questions[currentIdx];
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;
  const answered = Object.keys(answers).length;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isLowTime = timeLeft < 300;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 bg-muted" />
          <Skeleton className="h-64 bg-muted" />
          <div className="grid grid-cols-4 gap-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 bg-muted" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <GraduationCap className="w-5 h-5 text-primary shrink-0" />
              <span className="font-semibold text-sm text-foreground truncate">{quiz?.title}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold shrink-0
              ${isLowTime ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-muted border-border text-foreground'}`}>
              <Clock className="w-4 h-4" />
              <span className={isLowTime ? 'animate-pulse' : ''}>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
            </div>
          </div>
          {/* Progress */}
          <div className="mt-2 flex items-center gap-3">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground shrink-0">
              {currentIdx + 1}/{questions.length}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{answered} javob berildi</span>
            <span className="text-xs text-muted-foreground">{questions.length - answered} qoldi</span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {currentQ && (
          <div className="space-y-4 animate-fade-in">
            {/* Question card */}
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Badge className="shrink-0 mt-0.5 bg-primary/10 text-primary border-primary/20">
                    {currentIdx + 1}
                  </Badge>
                  <p className="text-base font-medium text-foreground text-pretty flex-1">
                    {currentQ.question_text}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Options */}
            <div className="grid gap-3">
              {OPTIONS.map(({ key }) => {
                const optText = currentQ[`option_${key.toLowerCase()}` as keyof Question] as string;
                const selected = answers[currentQ.id] === key;
                return (
                  <button
                    key={key}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: key }))}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                      ${selected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
                      }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm
                      ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {key}
                    </div>
                    <span className={`text-sm font-medium flex-1 ${selected ? 'text-foreground' : 'text-foreground'}`}>
                      {optText}
                    </span>
                    {selected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="h-10"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Oldingi
              </Button>

              <div className="flex gap-1 overflow-x-auto max-w-xs">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-7 h-7 rounded text-xs font-medium shrink-0 transition-colors
                      ${i === currentIdx ? 'bg-primary text-primary-foreground'
                        : answers[q.id] ? 'bg-success/20 text-success border border-success/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {currentIdx < questions.length - 1 ? (
                <Button onClick={() => setCurrentIdx(i => i + 1)} className="h-10">
                  Keyingi
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="h-10 bg-success text-white hover:bg-success/90">
                      <Send className="w-4 h-4 mr-1" />
                      Topshirish
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Imtihonni topshirasizmi?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Siz {answered} ta savolga javob berdingiz ({questions.length - answered} ta javobsiz qoldi).
                        Topshirgandan so'ng o'zgartirish mumkin emas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleSubmit(false)} disabled={submitting}>
                        Ha, topshirish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
