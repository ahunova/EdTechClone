import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, Eye, EyeOff, Loader2, UserRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("Foydalanish shartlari va maxfiylik siyosatiga rozilik bildiring");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Parollar mos kelmaydi");
      return;
    }
    if (password.length < 6) {
      toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      toast.error("Foydalanuvchi nomi 3-30 belgi: faqat harf, raqam va _");
      return;
    }

    setLoading(true);
    // Public registration always creates a student account
    const { error } = await signUp(username, fullName, password, 'student');
    setLoading(false);

    if (error) {
      toast.error("Ro'yxatdan o'tish xatosi: " + error.message);
      return;
    }

    toast.success("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/5"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-hover">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-balance">EduAI Platform</h1>
          <p className="text-sm text-muted-foreground mt-1">Aqlli ta'lim tizimi</p>
        </div>

        <Card className="shadow-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-balance">Ro'yxatdan o'tish</CardTitle>
            <CardDescription className="text-pretty">
              Yangi o'quvchi hisob yaratish uchun ma'lumotlarni to'ldiring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Role badge — fixed student */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <UserRound className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">O'quvchi sifatida ro'yxatdan o'tish</p>
                  <p className="text-xs text-muted-foreground">O'qituvchi hisobi uchun admin bilan bog'laning</p>
                </div>
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-normal">To'liq ism</Label>
                <Input
                  type="text"
                  placeholder="Ism Familiya"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="px-3"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Foydalanuvchi nomi</Label>
                <Input
                  type="text"
                  placeholder="foydalanuvchi_nomi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                  className="px-3"
                />
                <p className="text-xs text-muted-foreground">3-30 belgi: faqat harf, raqam va _</p>
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
                <p className="text-xs text-muted-foreground">Kamida 6 ta belgi</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Parolni tasdiqlang</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="px-3"
                />
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ro'yxatdan o'tilmoqda...</>
                ) : (
                  "Ro'yxatdan o'tish"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Hisobingiz bormi?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Kirish
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
