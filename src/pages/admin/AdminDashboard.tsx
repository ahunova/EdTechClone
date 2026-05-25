import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, ClipboardList, TrendingUp, GraduationCap, Pencil, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, Subject, UserRole } from '@/types/types';

interface PlatformStats {
  students: number;
  teachers: number;
  subjects: number;
  quizzes: number;
  attempts: number;
}

const COLORS = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];

const roleMap: Record<string, { label: string; className: string }> = {
  student: { label: "O'quvchi", className: 'bg-primary/10 text-primary border-primary/20' },
  teacher: { label: "O'qituvchi", className: 'bg-success/10 text-success border-success/20' },
  admin: { label: 'Admin', className: 'bg-warning/10 text-warning border-warning/20' },
};

// ── Overview section ─────────────────────────────────────────────────────────
function OverviewSection() {
  const [stats, setStats] = useState<PlatformStats>({ students: 0, teachers: 0, subjects: 0, quizzes: 0, attempts: 0 });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [stuRes, tchRes, subRes, quizRes, attRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('quizzes').select('id', { count: 'exact', head: true }),
        supabase.from('exam_attempts').select('id', { count: 'exact', head: true }).not('submitted_at', 'is', null),
      ]);
      const s: PlatformStats = {
        students: stuRes.count ?? 0,
        teachers: tchRes.count ?? 0,
        subjects: subRes.count ?? 0,
        quizzes: quizRes.count ?? 0,
        attempts: attRes.count ?? 0,
      };
      setStats(s);
      setChartData([
        { name: "O'quvchilar", value: s.students },
        { name: "O'qituvchilar", value: s.teachers },
        { name: 'Fanlar', value: s.subjects },
        { name: 'Testlar', value: s.quizzes },
        { name: 'Imtihonlar', value: s.attempts },
      ]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const items = [
    { label: "O'quvchilar", value: stats.students, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: "O'qituvchilar", value: stats.teachers, icon: GraduationCap, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Fanlar', value: stats.subjects, icon: BookOpen, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Testlar', value: stats.quizzes, icon: ClipboardList, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Imtihonlar', value: stats.attempts, icon: TrendingUp, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground text-balance">Admin boshqaruv paneli</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platforma statistikasi va umumiy ko'rinish</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {items.map(s => (
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
    </div>
  );
}

// ── Users section ─────────────────────────────────────────────────────────────
function UsersSection() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [savingRole, setSavingRole] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleSave = async () => {
    if (!editUser) return;
    setSavingRole(true);
    const { error } = await supabase.from('profiles').update({ role: editRole }).eq('id', editUser.id);
    setSavingRole(false);
    if (error) { toast.error("Rol yangilanmadi: " + error.message); return; }
    toast.success("Foydalanuvchi roli yangilandi");
    setEditUser(null);
    fetchUsers();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground text-balance">Foydalanuvchilar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Foydalanuvchilarni ko'ring va rollarini boshqaring</p>
      </div>
      <Card className="shadow-card">
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
    </div>
  );
}

// ── Subjects section ──────────────────────────────────────────────────────────
function SubjectsSection() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0], teacher_id: '' });

  const fetchData = async () => {
    setLoading(true);
    const [subRes, tchRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('profiles').select('id, username, full_name, role, avatar_url, email, created_at').eq('role', 'teacher').order('full_name'),
    ]);
    setSubjects(Array.isArray(subRes.data) ? subRes.data : []);
    setTeachers(Array.isArray(tchRes.data) ? tchRes.data : []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', color: COLORS[0], teacher_id: '' });
    setDialogOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description ?? '', color: s.color, teacher_id: s.teacher_id ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Fan nomi kiritilishi shart"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      teacher_id: form.teacher_id || null,
    };
    if (editing) {
      const { error } = await supabase.from('subjects').update(payload).eq('id', editing.id);
      if (error) { toast.error("Saqlashda xatolik: " + error.message); setSaving(false); return; }
      toast.success("Fan yangilandi");
    } else {
      const { error } = await supabase.from('subjects').insert(payload);
      if (error) { toast.error("Qo'shishda xatolik: " + error.message); setSaving(false); return; }
      toast.success("Fan qo'shildi");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) { toast.error("O'chirishda xatolik"); return; }
    toast.success("Fan o'chirildi");
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const teacherName = (id: string | null) => teachers.find(t => t.id === id)?.full_name ?? '—';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground text-balance">Fanlar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Barcha fanlarni boshqaring</p>
        </div>
        <Button onClick={openCreate} className="h-9 shrink-0">
          <Plus className="w-4 h-4 mr-2" />Fan qo'shish
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Fan</TableHead>
                  <TableHead className="whitespace-nowrap">Tavsif</TableHead>
                  <TableHead className="whitespace-nowrap">O'qituvchi</TableHead>
                  <TableHead className="whitespace-nowrap">Amal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1,2,3,4].map(i => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-8 bg-muted" /></TableCell>
                    </TableRow>
                  ))
                ) : subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Fanlar yo'q
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: s.color }}>
                            {s.name.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs">
                        <p className="truncate">{s.description || '—'}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {teacherName(s.teacher_id)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(s)}>
                            <Pencil className="w-3 h-3 mr-1" />Tahrir
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Fanni o'chirish</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{s.name}" fanini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  O'chirish
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">{editing ? 'Fanni tahrirlash' : "Fan qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Fan nomi *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Masalan: Matematika" className="px-3" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Tavsif</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Fan haqida qisqacha..." rows={2} className="px-3 resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">O'qituvchi</Label>
              <Select value={form.teacher_id} onValueChange={v => setForm(p => ({ ...p, teacher_id: v }))}>
                <SelectTrigger><SelectValue placeholder="O'qituvchi tanlang" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name || t.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Rang</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? 'Saqlash' : "Qo'shish"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Settings section ──────────────────────────────────────────────────────────
function SettingsSection() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground text-balance">Sozlamalar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platforma sozlamalari</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground text-sm">Sozlamalar bo'limi tez orada qo'shiladi</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const location = useLocation();
  const section = location.pathname.split('/').pop();

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {section === 'users' && <UsersSection />}
        {section === 'subjects' && <SubjectsSection />}
        {section === 'settings' && <SettingsSection />}
        {(section === 'dashboard' || !section) && <OverviewSection />}
      </div>
    </AppLayout>
  );
}
