import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, BookOpen, Play, ClipboardList, BarChart3,
  User, BrainCircuit, Settings, LogOut, Menu, GraduationCap,
  BookMarked, Users, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  // Student
  { label: 'Bosh sahifa', path: '/dashboard', icon: LayoutDashboard, roles: ['student'] },
  { label: 'Darsliklar', path: '/lessons', icon: Play, roles: ['student'] },
  { label: 'Imtihonlar', path: '/exams', icon: ClipboardList, roles: ['student'] },
  { label: 'Mening profilim', path: '/profile', icon: User, roles: ['student'] },
  { label: 'AI Maslahatchi', path: '/ai-advisor', icon: BrainCircuit, roles: ['student'] },
  // Teacher
  { label: 'Bosh sahifa', path: '/teacher/dashboard', icon: LayoutDashboard, roles: ['teacher'] },
  { label: 'Fanlar', path: '/teacher/subjects', icon: BookMarked, roles: ['teacher'] },
  { label: 'Test yaratish', path: '/teacher/quiz-builder', icon: ClipboardList, roles: ['teacher'] },
  { label: 'Tahlil', path: '/teacher/analytics', icon: BarChart3, roles: ['teacher'] },
  // Admin
  { label: 'Bosh sahifa', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { label: "Foydalanuvchilar", path: '/admin/users', icon: Users, roles: ['admin'] },
  { label: 'Fanlar', path: '/admin/subjects', icon: BookOpen, roles: ['admin'] },
  { label: 'Sozlamalar', path: '/admin/settings', icon: Settings, roles: ['admin'] },
];

function SidebarContent({ onNavigate, onSignOut }: { onNavigate?: () => void; onSignOut: () => void }) {
  const { profile } = useAuth();
  const location = useLocation();

  const role = profile?.role ?? 'student';
  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  const roleBadgeMap: Record<string, { label: string; className: string }> = {
    student: { label: "O'quvchi", className: 'bg-primary/20 text-primary' },
    teacher: { label: "O'qituvchi", className: 'bg-success/20 text-success' },
    admin: { label: 'Admin', className: 'bg-sidebar-primary/20 text-sidebar-primary' },
  };
  const badge = roleBadgeMap[role] ?? roleBadgeMap.student;

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary">
          <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="font-bold text-sm text-sidebar-foreground leading-tight">EduAI</p>
          <p className="text-xs text-sidebar-foreground/60 leading-tight">Platform</p>
        </div>
      </div>

      {/* User info */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm font-semibold">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {profile?.full_name || profile?.username || 'Foydalanuvchi'}
          </p>
          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', badge.className)}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 mb-2">
          Menyu
        </p>
        <ul className="space-y-0.5">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && item.path !== '/teacher/dashboard' &&
               item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 shrink-0" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={onSignOut}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="w-4 h-4" />
          <span>Chiqish</span>
        </Button>
      </div>
    </div>
  );
}


interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Tizimdan chiqildi');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-sidebar-border">
        <SidebarContent onSignOut={handleSignOut} />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Menyu ochish</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar">
              <SidebarContent onNavigate={() => setMobileOpen(false)} onSignOut={handleSignOut} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GraduationCap className="w-5 h-5 text-primary shrink-0" />
            <span className="font-bold text-sm text-foreground truncate">EduAI Platform</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Chiqish"
          >
            <LogOut className="w-4 h-4" />
            <span className="sr-only">Chiqish</span>
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
