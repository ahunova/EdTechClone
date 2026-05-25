import { useEffect, useState } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Trash2, Save, Send, ClipboardList, GripVertical, Loader2, CheckCircle,
  Pencil, Eye, EyeOff, ChevronDown, ChevronUp, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Subject } from '@/types/types';

interface QuestionForm {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
}

interface QuizRow {
  id: string;
  title: string;
  description: string;
  subject_id: string;
  duration_minutes: number;
  published: boolean;
  created_at: string;
  question_count?: number;
}

const emptyQuestion = (): QuestionForm => ({
  id: crypto.randomUUID(),
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
});

const OPTIONS: { key: 'A' | 'B' | 'C' | 'D' }[] = [
  { key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' },
];

export default function QuizBuilderPage() {
  const { profile } = useAuth();

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState('30');
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from('subjects').select('*').order('name');
    if (error) { toast.error('Fanlar yuklanmadi: ' + error.message); return; }
    setSubjects(Array.isArray(data) ? data : []);
  };

  const fetchQuizzes = async () => {
    if (!profile?.id) return;
    setQuizzesLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, questions(id)')
      .eq('created_by', profile.id)
      .order('created_at', { ascending: false });
    if (error) { toast.error('Testlar yuklanmadi: ' + error.message); setQuizzesLoading(false); return; }
    const rows: QuizRow[] = (Array.isArray(data) ? data : []).map((q: any) => ({
      ...q,
      question_count: Array.isArray(q.questions) ? q.questions.length : 0,
    }));
    setQuizzes(rows);
    setQuizzesLoading(false);
  };

  useEffect(() => { fetchSubjects(); }, []);
  useEffect(() => { fetchQuizzes(); }, [profile?.id]);

  const resetForm = () => {
    setEditingQuizId(null);
    setTitle(''); setDescription(''); setSubjectId(''); setDuration('30');
    setQuestions([emptyQuestion()]);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
    setTimeout(() => document.getElementById('quiz-form-top')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const openEditForm = async (quiz: QuizRow) => {
    setEditingQuizId(quiz.id);
    setTitle(quiz.title);
    setDescription(quiz.description ?? '');
    setSubjectId(quiz.subject_id);
    setDuration(String(quiz.duration_minutes));
    const { data, error } = await supabase
      .from('questions').select('*').eq('quiz_id', quiz.id).order('question_order');
    if (error) { toast.error('Savollar yuklanmadi'); return; }
    const qs: QuestionForm[] = (Array.isArray(data) ? data : []).map((q: any) => ({
      id: q.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option as 'A' | 'B' | 'C' | 'D',
    }));
    setQuestions(qs.length > 0 ? qs : [emptyQuestion()]);
    setShowForm(true);
    setTimeout(() => document.getElementById('quiz-form-top')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()]);

  const removeQuestion = (id: string) => {
    if (questions.length === 1) { toast.error("Kamida 1 ta savol bo'lishi kerak"); return; }
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof QuestionForm, value: string) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));

  const moveQuestion = (id: string, dir: 'up' | 'down') => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id);
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const validateForm = () => {
    if (!title.trim()) { toast.error("Test nomi kiritilishi shart"); return false; }
    if (!subjectId) { toast.error("Fan tanlanishi shart"); return false; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) { toast.error(`${i + 1}-savol matni kiritilishi shart`); return false; }
      if (!q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        toast.error(`${i + 1}-savol uchun barcha 4 ta variant to'ldirilishi kerak`); return false;
      }
    }
    return true;
  };

  const saveQuiz = async (publish: boolean) => {
    if (!validateForm()) return;
    publish ? setPublishing(true) : setSaving(true);
    try {
      const questionRows = (qid: string) => questions.map((q, idx) => ({
        quiz_id: qid,
        question_text: q.question_text.trim(),
        option_a: q.option_a.trim(),
        option_b: q.option_b.trim(),
        option_c: q.option_c.trim(),
        option_d: q.option_d.trim(),
        correct_option: q.correct_option,
        question_order: idx + 1,
      }));

      if (editingQuizId) {
        const { error: uErr } = await supabase.from('quizzes').update({
          subject_id: subjectId,
          title: title.trim(),
          description: description.trim(),
          duration_minutes: parseInt(duration) || 30,
          published: publish,
        }).eq('id', editingQuizId);
        if (uErr) throw new Error('Test yangilanmadi: ' + uErr.message);
        await supabase.from('questions').delete().eq('quiz_id', editingQuizId);
        const { error: qErr } = await supabase.from('questions').insert(questionRows(editingQuizId));
        if (qErr) throw new Error('Savollar yangilanmadi: ' + qErr.message);
        toast.success(publish ? "Test nashr etildi!" : "Test saqlandi");
      } else {
        const { data: quiz, error: iErr } = await supabase.from('quizzes').insert({
          subject_id: subjectId,
          title: title.trim(),
          description: description.trim(),
          duration_minutes: parseInt(duration) || 30,
          created_by: profile?.id,
          published: publish,
        }).select().maybeSingle();
        if (iErr || !quiz) throw new Error('Test saqlanmadi: ' + (iErr?.message ?? "Noma'lum xato"));
        const { error: qErr } = await supabase.from('questions').insert(questionRows(quiz.id));
        if (qErr) throw new Error('Savollar saqlanmadi: ' + qErr.message);
        toast.success(publish ? "Test nashr etildi!" : "Test qoralama sifatida saqlandi");
      }

      setShowForm(false);
      resetForm();
      fetchQuizzes();
    } catch (err: any) {
      toast.error(err.message ?? 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const togglePublish = async (quiz: QuizRow) => {
    const { error } = await supabase.from('quizzes').update({ published: !quiz.published }).eq('id', quiz.id);
    if (error) { toast.error('Xatolik: ' + error.message); return; }
    toast.success(quiz.published ? "Test yashirildi" : "Test nashr etildi");
    fetchQuizzes();
  };

  const deleteQuiz = async (id: string) => {
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) { toast.error("O'chirishda xatolik: " + error.message); return; }
    toast.success("Test o'chirildi");
    setQuizzes(prev => prev.filter(q => q.id !== id));
    if (editingQuizId === id) { setShowForm(false); resetForm(); }
  };

  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name ?? '—';

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground text-balance">Test yaratish</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Testlar yarating va boshqaring</p>
          </div>
          {!showForm && (
            <Button onClick={openCreateForm} className="h-9 shrink-0">
              <Plus className="w-4 h-4 mr-2" />Yangi test
            </Button>
          )}
        </div>

        {/* ── FORM ── */}
        {showForm && (
          <div id="quiz-form-top" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {editingQuizId ? "Testni tahrirlash" : "Yangi test"}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-8 text-muted-foreground">
                Bekor qilish
              </Button>
            </div>

            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-balance">Test ma'lumotlari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-normal">Test nomi *</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Test nomi" className="px-3" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-normal">Fan *</Label>
                    <Select value={subjectId} onValueChange={setSubjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder={subjects.length === 0 ? "Avval fan qo'shing" : "Fan tanlang"} />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">Fanlar mavjud emas</div>
                        ) : subjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-normal">Vaqt (daqiqa)</Label>
                    <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="5" max="180" className="px-3" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal">Tavsif</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Test haqida qisqacha..." rows={2} className="px-3 resize-none" />
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  Savollar
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{questions.length}</Badge>
                </h2>
                <Button variant="outline" size="sm" onClick={addQuestion} className="h-8">
                  <Plus className="w-4 h-4 mr-1.5" />Savol qo'shish
                </Button>
              </div>

              {questions.map((q, idx) => (
                <Card key={q.id} className="shadow-card border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveQuestion(q.id, 'up')} disabled={idx === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        <button type="button" onClick={() => moveQuestion(q.id, 'down')} disabled={idx === questions.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0 text-xs">{idx + 1}</Badge>
                      <div className="flex-1 min-w-0">
                        <Input
                          value={q.question_text}
                          onChange={e => updateQuestion(q.id, 'question_text', e.target.value)}
                          placeholder="Savol matnini kiriting..."
                          className="px-3 border-0 bg-muted/50 focus-visible:ring-1"
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="shrink-0 h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Separator />

                    <RadioGroup
                      value={q.correct_option}
                      onValueChange={v => updateQuestion(q.id, 'correct_option', v as 'A' | 'B' | 'C' | 'D')}
                      className="space-y-2"
                    >
                      {OPTIONS.map(({ key }) => {
                        const fieldKey = `option_${key.toLowerCase()}` as keyof QuestionForm;
                        const isCorrect = q.correct_option === key;
                        return (
                          <div key={key} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${isCorrect ? 'border-success/40 bg-success/5' : 'border-border bg-transparent'}`}>
                            <RadioGroupItem value={key} id={`${q.id}-${key}`} className="shrink-0" />
                            <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 text-xs font-bold ${isCorrect ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>
                              {key}
                            </div>
                            <Input
                              value={q[fieldKey] as string}
                              onChange={e => updateQuestion(q.id, fieldKey, e.target.value)}
                              placeholder={`${key} varianti...`}
                              className="flex-1 px-3 border-0 bg-transparent focus-visible:ring-0 h-7 p-0"
                            />
                            {isCorrect && <CheckCircle className="w-4 h-4 text-success shrink-0" />}
                          </div>
                        );
                      })}
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">✓ To'g'ri javob — radio tugmasini bosib belgilang</p>
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" onClick={addQuestion} className="w-full h-10 border-dashed">
                <Plus className="w-4 h-4 mr-2" />Savol qo'shish
              </Button>
            </div>

            <div className="flex gap-3 pb-2">
              <Button variant="outline" className="flex-1 h-11" onClick={() => saveQuiz(false)} disabled={saving || publishing}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Qoralama saqlash
              </Button>
              <Button className="flex-1 h-11" onClick={() => saveQuiz(true)} disabled={saving || publishing}>
                {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Nashr etish
              </Button>
            </div>
          </div>
        )}

        {/* ── EXISTING QUIZZES ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              Mening testlarim
              {!quizzesLoading && (
                <Badge className="bg-muted text-muted-foreground border-border text-xs">{quizzes.length}</Badge>
              )}
            </h2>
            {!showForm && (
              <Button variant="outline" size="sm" onClick={openCreateForm} className="h-8">
                <Plus className="w-4 h-4 mr-1.5" />Yangi test
              </Button>
            )}
          </div>

          {quizzesLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 bg-muted" />)}</div>
          ) : quizzes.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4 text-sm">Hali test yaratilmagan</p>
                <Button onClick={openCreateForm}><Plus className="w-4 h-4 mr-2" />Birinchi testni yarating</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {quizzes.map(quiz => (
                <Card key={quiz.id} className="shadow-card hover:shadow-hover transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">{quiz.title}</p>
                          <Badge className={quiz.published
                            ? 'bg-success/10 text-success border-success/20 text-xs shrink-0'
                            : 'bg-muted text-muted-foreground border-border text-xs shrink-0'}>
                            {quiz.published ? 'Nashr etilgan' : 'Qoralama'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <BookOpen className="w-3 h-3" />{subjectName(quiz.subject_id)}
                          </span>
                          <span className="text-xs text-muted-foreground">{quiz.question_count ?? 0} ta savol</span>
                          <span className="text-xs text-muted-foreground">{quiz.duration_minutes} daq</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => togglePublish(quiz)} title={quiz.published ? "Yashirish" : "Nashr etish"}
                          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          {quiz.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button type="button" onClick={() => openEditForm(quiz)} title="Tahrirlash"
                          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button type="button" title="O'chirish"
                              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Testni o'chirish</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{quiz.title}" testini o'chirasizmi? Barcha savollar ham o'chiriladi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteQuiz(quiz.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                O'chirish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
