import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, BookOpen, ClipboardList, TrendingUp, Calendar, Trophy, Award } from 'lucide-react';
import type { Attendance, ExamAttempt } from '@/types/types';

interface AttendanceWithSubject extends Attendance {
  subjects?: { name: string };
}

interface AttemptWithQuiz extends ExamAttempt {
  quizzes?: { title: string; subject_id: string; subjects?: { name: string } };
}

export default function StudentProfile() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<AttendanceWithSubject[]>([]);
  const [attempts, setAttempts] = useState<AttemptWithQuiz[]>([]);
  const [subjectCount, setSubjectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      setLoading(true);

      const [attRes, atmRes, subRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('*, subjects(name)')
          .eq('student_id', profile.id)
          .order('date', { ascending: false })
          .limit(30),
        supabase
          .from('exam_attempts')
          .select('*, quizzes(title, subject_id, subjects(name))')
          .eq('student_id', profile.id)
          .not('submitted_at', 'is', null)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('subject_enrollments')
          .select('id')
          .eq('student_id', profile.id),
      ]);

      setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
      setAttempts(Array.isArray(atmRes.data) ? atmRes.data : []);
      setSubjectCount(Array.isArray(subRes.data) ? subRes.data.length : 0);
      setLoading(false);
    };
    fetchData();
  }, [profile?.id]);

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + ((a.score ?? 0) / Math.max(a.total_questions, 1)) * 100, 0) / attempts.length)
    : 0;

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attendancePct = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

  const statusMap: Record<string, { label: string; className: string }> = {
    present: { label: 'Keldi', className: 'bg-success/10 text-success border-success/20' },
    absent: { label: 'Kelmadi', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    late: { label: 'Kech keldi', className: 'bg-warning/10 text-warning border-warning/20' },
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Profile header */}
        <Card className="shadow-card overflow-hidden">
          <div className="h-20 bg-primary/10"></div>
          <CardContent className="px-5 pb-5">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-10">
              <Avatar className="w-20 h-20 border-4 border-background shadow-md shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 md:mb-1">
                <h1 className="text-xl font-bold text-foreground text-balance">
                  {profile?.full_name || profile?.username || "O'quvchi"}
                </h1>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                <Badge className="mt-1 bg-primary/10 text-primary border-primary/20 text-xs">
                  O'quvchi
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 md:mb-1" type="button" onClick={() => {}}>
                <User className="w-4 h-4 mr-2" />
                Profilni tahrirlash
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 bg-muted" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Fanlar', value: subjectCount, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Imtihonlar', value: attempts.length, icon: ClipboardList, color: 'text-info', bg: 'bg-info/10' },
              { label: "O'rtacha ball", value: `${avgScore}%`, icon: Trophy, color: 'text-warning', bg: 'bg-warning/10' },
              { label: "Davomat", value: `${attendancePct}%`, icon: Calendar, color: 'text-success', bg: 'bg-success/10' },
            ].map(stat => (
              <Card key={stat.label} className="h-full shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.bg}`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="grades">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="grades" className="flex-1 md:flex-none">Baholar</TabsTrigger>
            <TabsTrigger value="attendance" className="flex-1 md:flex-none">Davomat</TabsTrigger>
            <TabsTrigger value="progress" className="flex-1 md:flex-none">Progress</TabsTrigger>
          </TabsList>

          {/* Grades tab */}
          <TabsContent value="grades" className="mt-4">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-balance">Imtihon natijalari</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Test nomi</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Ball</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Foiz</TableHead>
                        <TableHead className="whitespace-nowrap">Baho</TableHead>
                        <TableHead className="whitespace-nowrap">Sana</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5}><Skeleton className="h-8 bg-muted" /></TableCell>
                        </TableRow>
                      ) : attempts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                            Hali imtihon topshirilmagan
                          </TableCell>
                        </TableRow>
                      ) : (
                        attempts.map(a => {
                          const p = Math.round(((a.score ?? 0) / Math.max(a.total_questions, 1)) * 100);
                          const g = p >= 90 ? "A'lo" : p >= 75 ? 'Yaxshi' : p >= 55 ? 'Qoniqarli' : 'Qoniqarsiz';
                          return (
                            <TableRow key={a.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/exams/result/${a.id}`)}>
                              <TableCell className="whitespace-nowrap font-medium">{a.quizzes?.title || 'Test'}</TableCell>
                              <TableCell className="whitespace-nowrap text-right">{a.score}/{a.total_questions}</TableCell>
                              <TableCell className="whitespace-nowrap text-right">{p}%</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge variant={p >= 55 ? 'default' : 'destructive'} className="text-xs">{g}</Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                                {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('uz-UZ') : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance tab */}
          <TabsContent value="attendance" className="mt-4">
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base text-balance">Davomat jadvali</CardTitle>
                  <Badge className="bg-success/10 text-success border-success/20 shrink-0">{attendancePct}% davomat</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Sana</TableHead>
                        <TableHead className="whitespace-nowrap">Fan</TableHead>
                        <TableHead className="whitespace-nowrap">Holat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={3}><Skeleton className="h-8 bg-muted" /></TableCell></TableRow>
                      ) : attendance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            Davomat ma'lumotlari yo'q
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendance.map(a => {
                          const s = statusMap[a.status] ?? statusMap.present;
                          return (
                            <TableRow key={a.id}>
                              <TableCell className="whitespace-nowrap">
                                {new Date(a.date).toLocaleDateString('uz-UZ')}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {a.subjects?.name || '—'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge className={`text-xs ${s.className}`}>{s.label}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress tab */}
          <TabsContent value="progress" className="mt-4">
            <div className="space-y-4">
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-balance">O'quv progressi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Umumiy o'rtacha ball</span>
                      <span className="font-semibold">{avgScore}%</span>
                    </div>
                    <Progress value={avgScore} className="h-2.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Davomat</span>
                      <span className="font-semibold">{attendancePct}%</span>
                    </div>
                    <Progress value={attendancePct} className="h-2.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Topshirilgan imtihonlar</span>
                      <span className="font-semibold">{Math.min(attempts.length * 10, 100)}%</span>
                    </div>
                    <Progress value={Math.min(attempts.length * 10, 100)} className="h-2.5" />
                  </div>
                </CardContent>
              </Card>

              {/* Achievement badges */}
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-balance">Yutuqlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Birinchi imtihon', unlocked: attempts.length >= 1, icon: Trophy },
                      { label: "A'lo natija", unlocked: attempts.some(a => ((a.score ?? 0) / a.total_questions) >= 0.9), icon: Award },
                      { label: '5 ta imtihon', unlocked: attempts.length >= 5, icon: ClipboardList },
                      { label: 'Faol o\'quvchi', unlocked: subjectCount >= 2, icon: BookOpen },
                      { label: '100% davomat', unlocked: attendancePct === 100, icon: Calendar },
                      { label: 'Ilg\'or', unlocked: avgScore >= 80, icon: TrendingUp },
                    ].map(ach => (
                      <div
                        key={ach.label}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center
                          ${ach.unlocked ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30 opacity-50'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                          ${ach.unlocked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <ach.icon className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-medium text-foreground text-balance">{ach.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
