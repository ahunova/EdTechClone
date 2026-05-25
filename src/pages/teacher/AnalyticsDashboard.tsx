import { useEffect, useState } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { BarChart3, Users, Trophy, AlertTriangle, TrendingDown } from 'lucide-react';
import type { Quiz, Question } from '@/types/types';

interface QuizStat {
  quiz_id: string;
  quiz_title: string;
  attempt_count: number;
  avg_score: number;
  pass_rate: number;
}

interface QuestionStat {
  question_id: string;
  question_text: string;
  correct_count: number;
  total_answers: number;
  error_rate: number;
}

interface StudentRow {
  student_id: string;
  full_name: string;
  score: number;
  total: number;
  pct: number;
  date: string;
}

export default function AnalyticsDashboard() {
  const { profile } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all');
  const [quizStats, setQuizStats] = useState<QuizStat[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('quizzes')
        .select('*')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false });
      setQuizzes(Array.isArray(data) ? data : []);
    };
    fetchQuizzes();
  }, [profile?.id]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.id) return;
      setLoading(true);

      const quizFilter = quizzes.map(q => q.id);
      if (quizFilter.length === 0) { setLoading(false); return; }

      const targetIds = selectedQuiz !== 'all' ? [selectedQuiz] : quizFilter;

      // Fetch attempts
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('*, quizzes(title), profiles!exam_attempts_student_id_fkey(full_name, username)')
        .in('quiz_id', targetIds)
        .not('submitted_at', 'is', null);

      const attList = Array.isArray(attempts) ? attempts : [];

      // Build quiz stats
      const byQuiz: Record<string, { title: string; scores: number[]; pass: number }> = {};
      attList.forEach((a: any) => {
        if (!byQuiz[a.quiz_id]) byQuiz[a.quiz_id] = { title: a.quizzes?.title ?? 'Test', scores: [], pass: 0 };
        const pct = a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0;
        byQuiz[a.quiz_id].scores.push(pct);
        if (pct >= 55) byQuiz[a.quiz_id].pass++;
      });

      const qStats: QuizStat[] = Object.entries(byQuiz).map(([qid, v]) => ({
        quiz_id: qid,
        quiz_title: v.title,
        attempt_count: v.scores.length,
        avg_score: v.scores.length > 0 ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : 0,
        pass_rate: v.scores.length > 0 ? Math.round((v.pass / v.scores.length) * 100) : 0,
      }));
      setQuizStats(qStats);

      // Build student rows
      const rows: StudentRow[] = attList.map((a: any) => ({
        student_id: a.student_id,
        full_name: a.profiles?.full_name || a.profiles?.username || 'Noma\'lum',
        score: a.score ?? 0,
        total: a.total_questions ?? 0,
        pct: a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0,
        date: a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('uz-UZ') : '—',
      }));
      setStudentRows(rows.sort((a, b) => b.pct - a.pct));

      // Fetch question stats for selected quiz
      if (selectedQuiz !== 'all') {
        const { data: qAnswers } = await supabase
          .from('exam_answers')
          .select('question_id, is_correct, questions(question_text)')
          .in('attempt_id',
            attList.map((a: any) => a.id)
          );

        const byQ: Record<string, { text: string; correct: number; total: number }> = {};
        (Array.isArray(qAnswers) ? qAnswers : []).forEach((ans: any) => {
          const qid = ans.question_id;
          if (!byQ[qid]) byQ[qid] = { text: ans.questions?.question_text ?? 'Savol', correct: 0, total: 0 };
          byQ[qid].total++;
          if (ans.is_correct) byQ[qid].correct++;
        });

        const qs: QuestionStat[] = Object.entries(byQ).map(([qid, v]) => ({
          question_id: qid,
          question_text: v.text.length > 60 ? v.text.slice(0, 60) + '...' : v.text,
          correct_count: v.correct,
          total_answers: v.total,
          error_rate: v.total > 0 ? Math.round(((v.total - v.correct) / v.total) * 100) : 0,
        })).sort((a, b) => b.error_rate - a.error_rate);
        setQuestionStats(qs);
      } else {
        setQuestionStats([]);
      }
      setLoading(false);
    };
    fetchStats();
  }, [profile?.id, selectedQuiz, quizzes]);

  const avgOverall = quizStats.length > 0 ? Math.round(quizStats.reduce((s, q) => s + q.avg_score, 0) / quizStats.length) : 0;
  const totalAttempts = quizStats.reduce((s, q) => s + q.attempt_count, 0);
  const weakQuestions = questionStats.filter(q => q.error_rate > 50).length;

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground text-balance">Tahlil paneli</h1>
            <p className="text-sm text-muted-foreground mt-0.5">O'quvchilar natijalari va statistika</p>
          </div>
          <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
            <SelectTrigger className="w-48 shrink-0">
              <SelectValue placeholder="Testni tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha testlar</SelectItem>
              {quizzes.map(q => (
                <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Testlar', value: quizStats.length, icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Topshirishlar', value: totalAttempts, icon: Users, color: 'text-info', bg: 'bg-info/10' },
            { label: "O'rtacha ball", value: `${avgOverall}%`, icon: Trophy, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Qiyin savollar', value: weakQuestions, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
          ].map(s => (
            <Card key={s.label} className="h-full shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{loading ? '—' : s.value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        {!loading && quizStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-balance">Testlar bo'yicha o'rtacha ball</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={quizStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="quiz_title" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                        tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${v}%`, "O'rtacha ball"]} />
                      <Bar dataKey="avg_score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-balance">O'tish foizi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={quizStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="quiz_title" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                        tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${v}%`, "O'tish foizi"]} />
                      <Bar dataKey="pass_rate" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Student results table */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-balance">Guruh natijalari</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">#</TableHead>
                    <TableHead className="whitespace-nowrap">O'quvchi</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Ball</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Foiz</TableHead>
                    <TableHead className="whitespace-nowrap">Baho</TableHead>
                    <TableHead className="whitespace-nowrap">Sana</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}><Skeleton className="h-8 bg-muted" /></TableCell>
                    </TableRow>
                  ) : studentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Hali topshirilgan imtihon yo'q
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentRows.map((row, idx) => {
                      const g = row.pct >= 90 ? "A'lo" : row.pct >= 75 ? 'Yaxshi' : row.pct >= 55 ? 'Qoniqarli' : 'Qoniqarsiz';
                      return (
                        <TableRow key={`${row.student_id}-${idx}`}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="whitespace-nowrap font-medium">{row.full_name}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{row.score}/{row.total}</TableCell>
                          <TableCell className="whitespace-nowrap text-right font-semibold">{row.pct}%</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant={row.pct >= 55 ? 'default' : 'destructive'} className="text-xs">{g}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{row.date}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Difficult questions */}
        {selectedQuiz !== 'all' && questionStats.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-balance">
                <TrendingDown className="w-4 h-4 text-destructive" />
                Qiyin savollar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Savol</TableHead>
                      <TableHead className="whitespace-nowrap text-right">To'g'ri</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Jami</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Xato foizi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questionStats.map(q => (
                      <TableRow key={q.question_id}>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-pretty line-clamp-2">{q.question_text}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-success font-medium">{q.correct_count}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">{q.total_answers}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Badge
                            variant={q.error_rate > 50 ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {q.error_rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
