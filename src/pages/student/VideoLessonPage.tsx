import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/components/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Play, Clock, BookOpen, ChevronLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { Subject, VideoLesson } from '@/types/types';

function getYoutubeId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

function getGDriveId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function VideoPlayer({ lesson }: { lesson: VideoLesson }) {
  if (lesson.video_type === 'youtube') {
    const videoId = getYoutubeId(lesson.video_url);
    if (videoId) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={lesson.title}
          />
        </div>
      );
    }
  }
  if (lesson.video_type === 'gdrive') {
    const fileId = getGDriveId(lesson.video_url);
    if (fileId) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            className="w-full h-full"
            allow="autoplay"
            title={lesson.title}
          />
        </div>
      );
    }
  }
  // Fallback: direct link
  return (
    <div className="aspect-video w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-3">
      <Play className="w-12 h-12 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Video yuklanmadi</p>
      <a href={lesson.video_url} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          <ExternalLink className="w-4 h-4 mr-2" />
          Videoni ochish
        </Button>
      </a>
    </div>
  );
}

export default function VideoLessonPage() {
  const { subjectId } = useParams<{ subjectId?: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('*').order('name');
      const list = Array.isArray(data) ? data : [];
      setSubjects(list);
      if (list.length > 0) {
        const target = subjectId ? list.find(s => s.id === subjectId) ?? list[0] : list[0];
        setSelectedSubject(target);
      }
      setLoading(false);
    };
    fetchSubjects();
  }, [subjectId]);

  useEffect(() => {
    if (!selectedSubject) return;
    const fetchLessons = async () => {
      const { data } = await supabase
        .from('video_lessons')
        .select('*')
        .eq('subject_id', selectedSubject.id)
        .order('lesson_order');
      const list = Array.isArray(data) ? data : [];
      setLessons(list);
      if (list.length > 0) setSelectedLesson(list[0]);
    };
    fetchLessons();
  }, [selectedSubject]);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchCompletions = async () => {
      const { data } = await supabase
        .from('video_completions')
        .select('lesson_id')
        .eq('student_id', profile.id);
      setCompletedIds(new Set((data ?? []).map((c: any) => c.lesson_id)));
    };
    fetchCompletions();
  }, [profile?.id]);

  const markComplete = async () => {
    if (!selectedLesson || !profile?.id) return;
    if (completedIds.has(selectedLesson.id)) {
      toast.info("Bu dars allaqachon bajarilgan");
      return;
    }
    setMarking(true);
    const { error } = await supabase.from('video_completions').insert({
      student_id: profile.id,
      lesson_id: selectedLesson.id,
    });
    setMarking(false);
    if (error) { toast.error("Xatolik yuz berdi"); return; }
    setCompletedIds(prev => new Set([...prev, selectedLesson.id]));
    toast.success("Dars bajarildi deb belgilandi!");

    // Auto-advance to next lesson
    const idx = lessons.findIndex(l => l.id === selectedLesson.id);
    if (idx < lessons.length - 1) setSelectedLesson(lessons[idx + 1]);
  };

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground text-balance">Video darslar</h1>
            <p className="text-sm text-muted-foreground truncate">
              {selectedSubject?.name ?? 'Fan tanlang'}
            </p>
          </div>
        </div>

        {/* Subject tabs */}
        {loading ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-24 shrink-0 bg-muted" />)}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap">
            {subjects.map(s => (
              <Button
                key={s.id}
                size="sm"
                variant={selectedSubject?.id === s.id ? 'default' : 'outline'}
                onClick={() => setSelectedSubject(s)}
                className="shrink-0 h-8"
              >
                {s.name}
              </Button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lesson list */}
          <Card className="shadow-card md:col-span-1 h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-balance">Darslar ro'yxati</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {lessons.length === 0 ? (
                <div className="text-center py-6">
                  <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Darslar mavjud emas</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {lessons.map((lesson, idx) => {
                    const done = completedIds.has(lesson.id);
                    const active = selectedLesson?.id === lesson.id;
                    return (
                      <li key={lesson.id}>
                        <button
                          onClick={() => setSelectedLesson(lesson)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                            active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                            ${done ? 'bg-success/20 text-success' : active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {done ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${active ? 'text-primary-foreground' : 'text-foreground'}`}>
                              {lesson.title}
                            </p>
                            {lesson.duration_minutes > 0 && (
                              <p className={`text-xs flex items-center gap-1 ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                <Clock className="w-3 h-3" />
                                {lesson.duration_minutes} daq
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Video player */}
          <div className="md:col-span-2 space-y-4">
            {selectedLesson ? (
              <>
                <VideoPlayer lesson={selectedLesson} />
                <Card className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-foreground text-balance">
                          {selectedLesson.title}
                        </h2>
                        {selectedLesson.description && (
                          <p className="text-sm text-muted-foreground mt-1 text-pretty">
                            {selectedLesson.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {selectedLesson.duration_minutes > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {selectedLesson.duration_minutes} daqiqa
                            </span>
                          )}
                          {completedIds.has(selectedLesson.id) && (
                            <Badge className="bg-success/10 text-success border-success/20 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Bajarildi
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={markComplete}
                        disabled={marking || completedIds.has(selectedLesson.id)}
                        size="sm"
                        className="shrink-0 h-9"
                        variant={completedIds.has(selectedLesson.id) ? 'outline' : 'default'}
                      >
                        {completedIds.has(selectedLesson.id) ? (
                          <><CheckCircle className="w-4 h-4 mr-1" /> Bajarildi</>
                        ) : (
                          "Bajarildi deb belgilash"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-12 h-12 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Darsni tanlang</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
