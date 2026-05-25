import { useEffect, useState } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, ClipboardList, TrendingUp, GraduationCap, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, UserRole } from '@/types/types';

interface PlatformStats {
  students: number;
  teachers: number;
  subjects: number;
  quizzes: number;
  attempts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats>({ students: 0, teachers: 0, subjects: 0, quizzes: 0, attempts: 0 });
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [savingRole, setSavingRole] = useState(false);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);

  const fetchData = async () => {
    setLoading(true);

    const [stuRes, tchRes, subRes, quizRes, attRes, usersRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('subjects').select('id', { count: 'exact', head: true }),
      supabase.from('quizzes').select('id', { count: 'exact', head: true }),
      supabase.from('exam_attempts').select('id', { count: 'exact', head: true }).not('submitted_at', 'is', null),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    const s: PlatformStats = {
      students: stuRes.count ?? 0,
      teachers: tchRes.count ?? 0,
      subjects: subRes.count ?? 0,
      quizzes: quizRes.count ?? 0,
      attempts: attRes.count ?? 0,
    };
    setStats(s);
    setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    setChartData([
      { name: "O'quvchilar", value: s.students },
      { name: "O'qituvchilar", value: s.teachers },
      { name: 'Fanlar', value: s.subjects },
      { name: 'Testlar', value: s.quizzes },
      { name: 'Imtihonlar', value: s.attempts },
    ]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRoleSave = async () => {
    if (!editUser) return;
    setSavingRole(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role: editRole })
      .eq('id', editUser.id);
    setSavingRole(false);
    if (error) { toast.error("Rol yangilanmadi: " + error.message); return; }
    toast.success("Foydalanuvchi roli yangilandi");
    setEditUser(null);
    fetchData();
  };

  const roleMap: Record<string, { label: string; className: string }> = {
    student: { label: "O'quvchi", className: 'bg-primary/10 text-primary border-primary/20' },
    teacher: { label: "O'qituvchi", className: 'bg-success/10 text-success border-success/20' },
    admin: { label: 'Admin', className: 'bg-warning/10 text-warning border-warning/20' },
  };

  const platformStats = [
    { label: "O'quvchilar", value: stats.students, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: "O'qituvchilar", value: stats.teachers, icon: GraduationCap, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Fanlar', value: stats.subjects, icon: BookOpen, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Testlar', value: stats.quizzes, icon: ClipboardList, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Imtihonlar', value: stats.attempts, icon: TrendingUp, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground text-balance">Admin boshqaruv paneli</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platforma statistikasi va foydalanuvchilar boshqaruvi</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {platformStats.map(s => (
            <Card key={s.label} className="h-full shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{loading ? '—' : s.value}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart */}
        {!loading && (
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-balance">Platforma ko'rsatkichlari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Soni" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users table */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-balance">Foydalanuvchilar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Foydalanuvchi</TableHead>
                    <TableHead className="whitespace-nowrap">Username</TableHead>
                    <TableHead className="whitespace-nowrap">Rol</TableHead>
                    <TableHead className="whitespace-nowrap">Ro'yxat sanasi</TableHead>
                    <TableHead className="whitespace-nowrap">Amal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [1,2,3,4,5].map(i => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}><Skeleton className="h-8 bg-muted" /></TableCell>
                      </TableRow>
                    ))
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Foydalanuvchilar yo'q
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map(u => {
                      const rb = roleMap[u.role] ?? roleMap.student;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                  {u.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{u.full_name || 'Nomsiz'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-sm">@{u.username}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className={`text-xs ${rb.className}`}>{rb.label}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                            {new Date(u.created_at).toLocaleDateString('uz-UZ')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => { setEditUser(u); setEditRole(u.role); }}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Rol
                            </Button>
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
      </div>

      {/* Edit role dialog */}
      <Dialog open={!!editUser} onOpenChange={open => !open && setEditUser(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">Rol o'zgartirish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{editUser?.full_name}</span> uchun yangi rol tanlang:
            </p>
            <Select value={editRole} onValueChange={v => setEditRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">O'quvchi</SelectItem>
                <SelectItem value="teacher">O'qituvchi</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>Bekor qilish</Button>
              <Button className="flex-1" onClick={handleRoleSave} disabled={savingRole}>
                {savingRole && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Saqlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
