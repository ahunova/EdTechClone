import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      const redirectMap: Record<string, string> = {
        student: '/dashboard',
        teacher: '/teacher/dashboard',
        admin: '/admin/dashboard',
      };
      navigate(redirectMap[profile.role] ?? '/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  // eslint-disable-next-line no-console
  console.log("[LoginPage] mounted");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("Foydalanish shartlari va maxfiylik siyosatiga rozilik bildiring");
      return;
    }
    setLoading(true);
    const { error } = await signIn(username, password);
    setLoading(false);
    if (error) {
      toast.error('Kirish xatosi: ' + error.message);
      return;
    }
    toast.success("Tizimga muvaffaqiyatli kirdingiz!");
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/5"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/5"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-hover">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-balance">EduAI Platform</h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Aqlli ta'lim tizimi
          </p>
        </div>

        <Card className="shadow-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-balance">Tizimga kirish</CardTitle>
            <CardDescription className="text-pretty">
              Foydalanuvchi nomi va parolingizni kiriting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Foydalanuvchi nomi</Label>
                <Input
                  type="text"
                  placeholder="foydalanuvchi_nomi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="px-3"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Parol</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="px-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 min-h-12 pt-1">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(!!v)}
                  className="mt-0.5 shrink-0"
                />
                <label htmlFor="agree" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  Men{' '}
                  <span className="text-primary underline cursor-pointer">Foydalanish shartlari</span>
                  {' '}va{' '}
                  <span className="text-primary underline cursor-pointer">Maxfiylik siyosatiga</span>
                  {' '}roziman
                </label>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Kirish...</>
                ) : (
                  'Kirish'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Hisobingiz yo'qmi?{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  Ro'yxatdan o'tish
                </Link>
              </p>
            </div>

            {/* Demo credentials hint */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground font-medium mb-1">Demo hisoblar:</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p><span className="font-medium">Admin:</span> eduadmin / Admin123!</p>
                <p><span className="font-medium">O'qituvchi:</span> eduteacher / Teacher123!</p>
                <p><span className="font-medium">O'quvchi:</span> estudent / Student123!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
