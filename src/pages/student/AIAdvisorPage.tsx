import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BrainCircuit, BookOpen, TrendingUp, Target, Lightbulb, ArrowRight, Zap, AlertTriangle } from 'lucide-react';
import type { ExamAttempt } from '@/types/types';

interface AttemptWithQuiz extends ExamAttempt {
  quizzes?: { title: string; subjects?: { name: string } };
}

interface Recommendation {
  type: 'improve' | 'strength' | 'tip' | 'warning';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export default function AIAdvisorPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<AttemptWithQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      setLoading(true);

      const { data } = await supabase
        .from('exam_attempts')
        .select('*, quizzes(title, subjects(name))')
        .eq('student_id', profile.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false });

      const list = Array.isArray(data) ? data : [];
      setAttempts(list);
      generateRecommendations(list);
      setLoading(false);
    };
    fetchData();
  }, [profile?.id]);

  const generateRecommendations = (list: AttemptWithQuiz[]) => {
    const recs: Recommendation[] = [];

    if (list.length === 0) {
      recs.push({
        type: 'tip',
        title: "Birinchi qadamni tashlang!",
        description: "Imtihon topshing va AI maslahatchi sizga shaxsiylashtirilgan tavsiyalar beradi.",
        icon: Zap,
        badge: 'Boshlang',
      });
      recs.push({
        type: 'tip',
        title: "Video darslarni ko'ring",
        description: "Har kuni kamida 30 daqiqa o'qish sizning bilimingizni sezilarli oshiradi.",
        icon: BookOpen,
        badge: 'Maslahat',
      });
      setRecommendations(recs);
      return;
    }

    const avg = list.reduce((s, a) => s + ((a.score ?? 0) / Math.max(a.total_questions, 1)) * 100, 0) / list.length;
    const recent = list.slice(0, 3);
    const recentAvg = recent.reduce((s, a) => s + ((a.score ?? 0) / Math.max(a.total_questions, 1)) * 100, 0) / recent.length;
    const improving = list.length >= 2 && recentAvg > avg;

    if (avg >= 85) {
      recs.push({
        type: 'strength',
        title: "Ajoyib natijalar!",
        description: `Siz o'rtacha ${Math.round(avg)}% ball to'playapsiz. Bu juda yuqori ko'rsatkich. Murakkab mavzularni o'rganishga o'tishingiz mumkin.`,
        icon: Target,
        badge: "A'lo daraja",
      });
    } else if (avg >= 70) {
      recs.push({
        type: 'strength',
        title: "Yaxshi natijalar",
        description: `O'rtacha ${Math.round(avg)}% ball — siz to'g'ri yo'ldasiz. Biroq 85% ga yetish uchun zaif mavzularni takrorlang.`,
        icon: TrendingUp,
        badge: 'Yaxshi',
      });
    } else {
      recs.push({
        type: 'warning',
        title: "Qo'shimcha mashg'ulot zarur",
        description: `O'rtacha ballingiz ${Math.round(avg)}%. Dars materiallarini qayta ko'rib chiqing va video darslardan foydalaning.`,
        icon: AlertTriangle,
        badge: 'Diqqat',
      });
    }

    if (improving) {
      recs.push({
        type: 'strength',
        title: "Progressingiz zo'r!",
        description: "So'nggi imtihonlaringizda o'sish kuzatilmoqda. Shu sur'atni saqlang va tartibli o'qing.",
        icon: TrendingUp,
        badge: 'O\'sish',
      });
    }

    // Low score analysis
    const weakAttempts = list.filter(a => ((a.score ?? 0) / Math.max(a.total_questions, 1)) < 0.6);
    if (weakAttempts.length > 0) {
      const subjectNames = [...new Set(weakAttempts.map(a => a.quizzes?.subjects?.name).filter(Boolean))];
      recs.push({
        type: 'improve',
        title: "Zaif mavzular aniqlandi",
        description: `Quyidagi fanlarda qo'shimcha mashg'ulot tavsiya etiladi: ${subjectNames.slice(0, 3).join(', ') || 'Ba\'zi fanlar'}. Bu fanlarning video darslarini ko'ring.`,
        icon: BookOpen,
        badge: 'Tavsiya',
      });
    }

    recs.push({
      type: 'tip',
      title: "Kunlik o'quv rejimi",
      description: "Eng samarali usul: ertalab yangi mavzu, tushdan keyin takrorlash, kechqurun test. 25 daqiqalik Pomodoro usulini sinab ko'ring.",
      icon: Lightbulb,
      badge: 'Maslahat',
    });

    if (list.length < 5) {
      recs.push({
        type: 'tip',
        title: "Ko'proq imtihon topshing",
        description: "Hali siz faqat bir nechta imtihon topshirdingiz. Qancha ko'p mashq qilsangiz, AI sizga aniqroq tavsiya bera oladi.",
        icon: Zap,
        badge: 'Eslatma',
      });
    }

    setRecommendations(recs);
  };

  const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
    improve: { bg: 'bg-primary/5', border: 'border-primary/30', icon: 'text-primary' },
    strength: { bg: 'bg-success/5', border: 'border-success/30', icon: 'text-success' },
    tip: { bg: 'bg-warning/5', border: 'border-warning/30', icon: 'text-warning' },
    warning: { bg: 'bg-destructive/5', border: 'border-destructive/30', icon: 'text-destructive' },
  };

  const badgeStyles: Record<string, string> = {
    improve: 'bg-primary/10 text-primary border-primary/20',
    strength: 'bg-success/10 text-success border-success/20',
    tip: 'bg-warning/10 text-warning border-warning/20',
    warning: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + ((a.score ?? 0) / Math.max(a.total_questions, 1)) * 100, 0) / attempts.length)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground text-balance">AI Maslahatchi</h1>
            <p className="text-sm text-muted-foreground text-pretty mt-0.5">
              Sizning o'quv natijalaringiz asosida shaxsiylashtirilgan tavsiyalar
            </p>
          </div>
        </div>

        {/* Summary card */}
        {attempts.length > 0 && (
          <Card className="shadow-card border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground text-pretty">
                    AI tahlil asosida: {attempts.length} ta imtihon ko'rib chiqildi
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    O'rtacha ball: <span className="font-semibold text-primary">{avgScore}%</span>
                  </p>
                </div>
                <BrainCircuit className="w-8 h-8 text-primary opacity-50 shrink-0" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 bg-muted" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => {
              const style = typeStyles[rec.type] ?? typeStyles.tip;
              const bStyle = badgeStyles[rec.type] ?? badgeStyles.tip;
              return (
                <Card key={idx} className={`shadow-card border ${style.border} ${style.bg}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-background/50`}>
                        <rec.icon className={`w-5 h-5 ${style.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-semibold text-foreground text-balance">{rec.title}</h3>
                          {rec.badge && (
                            <Badge className={`text-xs shrink-0 ${bStyle}`}>{rec.badge}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground text-pretty">{rec.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick actions */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-balance">Tavsiya etilgan amallar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/lessons')} className="h-9">
              <BookOpen className="w-4 h-4 mr-2" />
              Video darslar
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/exams')} className="h-9">
              <Target className="w-4 h-4 mr-2" />
              Imtihon topshirish
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/profile')} className="h-9">
              <TrendingUp className="w-4 h-4 mr-2" />
              Progressimni ko'rish
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
