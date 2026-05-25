import { useEffect, useState } from 'react';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, BookMarked, Loader2, Play, Youtube, Clock, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { Subject, VideoLesson } from '@/types/types';

const COLORS = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];

// ─── Helpers ────────────────────────────────────────────────────────────────
function getYoutubeId(url: string): string | null {
  const m = url.match(/^.*((youtu\.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/);
  return m && m[7].length === 11 ? m[7] : null;
}

function isYoutubeUrl(url: string) {
  return /youtu\.?be/.test(url);
}

// ─── Video Lessons Dialog ────────────────────────────────────────────────────
interface VideoLessonsDialogProps {
  subject: Subject;
}

function VideoLessonsDialog({ subject }: VideoLessonsDialogProps) {
  const [open, setOpen] = useState(false);
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<VideoLesson | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', video_url: '', duration_minutes: '' });

  const fetchLessons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('video_lessons')
      .select('*')
      .eq('subject_id', subject.id)
      .order('lesson_order');
    setLessons(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditLesson(null);
    setForm({ title: '', description: '', video_url: '', duration_minutes: '' });
    setAddOpen(true);
  };

  const openEdit = (l: VideoLesson) => {
    setEditLesson(l);
    setForm({
      title: l.title,
      description: l.description ?? '',
      video_url: l.video_url,
      duration_minutes: l.duration_minutes > 0 ? String(l.duration_minutes) : '',
    });
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Dars nomi kiritilishi shart"); return; }
    if (!form.video_url.trim()) { toast.error("Video havolasi kiritilishi shart"); return; }

    const videoType = isYoutubeUrl(form.video_url) ? 'youtube'
      : form.video_url.includes('drive.google.com') ? 'gdrive'
      : 'other';

    if (videoType === 'youtube' && !getYoutubeId(form.video_url)) {
      toast.error("Noto'g'ri YouTube havolasi. Masalan: https://www.youtube.com/watch?v=xxxxx");
      return;
    }

    setSaving(true);
    if (editLesson) {
      const { error } = await supabase.from('video_lessons').update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        video_url: form.video_url.trim(),
        video_type: videoType,
        duration_minutes: parseInt(form.duration_minutes) || 0,
      }).eq('id', editLesson.id);
      if (error) { toast.error("Saqlashda xatolik: " + error.message); setSaving(false); return; }
      toast.success("Dars yangilandi");
    } else {
      const { error } = await supabase.from('video_lessons').insert({
        subject_id: subject.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        video_url: form.video_url.trim(),
        video_type: videoType,
        duration_minutes: parseInt(form.duration_minutes) || 0,
        lesson_order: lessons.length + 1,
      });
      if (error) { toast.error("Qo'shishda xatolik: " + error.message); setSaving(false); return; }
      toast.success("Dars qo'shildi");
    }
    setSaving(false);
    setAddOpen(false);
    fetchLessons();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('video_lessons').delete().eq('id', id);
    if (error) { toast.error("O'chirishda xatolik"); return; }
    toast.success("Dars o'chirildi");
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 h-9"
        onClick={() => { setOpen(true); fetchLessons(); }}
      >
        <Play className="w-3 h-3 mr-1.5" />
        Video darslar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-balance flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: subject.color }}>
                {subject.name.charAt(0)}
              </div>
              {subject.name} — Video darslar
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Add button */}
            <div className="flex justify-end">
              <Button size="sm" className="h-8" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-1.5" />
                Dars qo'shish
              </Button>
            </div>

            {/* Lessons list */}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-muted" />)}
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
                <Youtube className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Hali dars qo'shilmagan</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Birinchi darsni qo'shish
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {lessons.map((lesson, idx) => {
                  const ytId = isYoutubeUrl(lesson.video_url) ? getYoutubeId(lesson.video_url) : null;
                  return (
                    <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      {/* Thumbnail */}
                      {ytId ? (
                        <img
                          src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                          alt={lesson.title}
                          className="w-16 h-10 rounded object-cover shrink-0 bg-muted"
                        />
                      ) : (
                        <div className="w-16 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <Play className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                      )}
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">
                            {lesson.video_type === 'youtube' ? 'YouTube' : lesson.video_type === 'gdrive' ? 'Google Drive' : 'Havola'}
                          </Badge>
                          {lesson.duration_minutes > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />{lesson.duration_minutes} daq
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(lesson)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Darsni o'chirish</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{lesson.title}" darsini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(lesson.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                O'chirish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit lesson dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">
              {editLesson ? 'Darsni tahrirlash' : "Yangi dars qo'shish"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Dars nomi *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Masalan: Kvadrat tenglamalar"
                className="px-3"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Video havolasi * (YouTube yoki boshqa)</Label>
              <Input
                value={form.video_url}
                onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
                className="px-3"
                type="url"
              />
              {form.video_url && isYoutubeUrl(form.video_url) && (
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <Youtube className="w-3.5 h-3.5" />
                  YouTube havolasi aniqlandi
                  {getYoutubeId(form.video_url) && (
                    <img
                      src={`https://img.youtube.com/vi/${getYoutubeId(form.video_url)}/default.jpg`}
                      alt="preview"
                      className="ml-2 h-8 w-14 rounded object-cover border border-border"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Tavsif</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Dars haqida qisqacha ma'lumot..."
                rows={2}
                className="px-3 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-normal">Davomiylik (daqiqa)</Label>
              <Input
                value={form.duration_minutes}
                onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value.replace(/\D/g, '') }))}
                placeholder="Masalan: 15"
                className="px-3"
                type="text"
                inputMode="numeric"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                Bekor qilish
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editLesson ? 'Saqlash' : "Qo'shish"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SubjectManagementPage() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });

  const fetchSubjects = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });
    setSubjects(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchSubjects(); }, [profile?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', color: COLORS[0] });
    setDialogOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description, color: s.color });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Fan nomi kiritilishi shart"); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('subjects').update({
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
      }).eq('id', editing.id);
      if (error) { toast.error("Saqlashda xatolik: " + error.message); setSaving(false); return; }
      toast.success("Fan yangilandi");
    } else {
      const { error } = await supabase.from('subjects').insert({
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        teacher_id: profile?.id,
      });
      if (error) { toast.error("Qo'shishda xatolik: " + error.message); setSaving(false); return; }
      toast.success("Fan qo'shildi");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchSubjects();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) { toast.error("O'chirishda xatolik"); return; }
    toast.success("Fan o'chirildi");
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground text-balance">Fanlar boshqaruvi</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Fanlaringizni qo'shing va tahrirlang</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="h-9 shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Fan qo'shish
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-balance">{editing ? 'Fanni tahrirlash' : "Fan qo'shish"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal">Fan nomi *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Masalan: Matematika"
                    className="px-3"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal">Tavsif</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Fan haqida qisqacha ma'lumot..."
                    rows={3}
                    className="px-3 resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal">Rang</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, color: c }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
                  <Button className="flex-1" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {editing ? 'Saqlash' : "Qo'shish"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Subjects grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-36 bg-muted" />)}
          </div>
        ) : subjects.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-14 text-center">
              <BookMarked className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Hali fan qo'shilmagan</p>
              <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Birinchi fanni qo'shish</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map(s => (
              <Card key={s.id} className="h-full shadow-card hover:shadow-hover transition-shadow flex flex-col">
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-base"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-balance">{s.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 text-pretty line-clamp-2">
                        {s.description || "Fan tavsifi yo'q"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <VideoLessonsDialog subject={s} />
                    <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => openEdit(s)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Fanni o'chirish</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{s.name}" fanini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(s.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            O'chirish
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
