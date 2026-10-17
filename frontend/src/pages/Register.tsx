import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { SocialLogin } from '@/components/SocialLogin';
import { isAxiosError } from 'axios';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const { register } = useAuthStore();
  const { toast } = useToast();

  const passwordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = passwordStrength();
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-coders-green'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (strength < 2) {
      toast({ title: 'Password too weak', description: 'Use at least 8 chars with uppercase and numbers', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await register(email, username, password);
      setSuccess(true);
    } catch (err: unknown) {
      const message = isAxiosError(err) && typeof err.response?.data?.error === 'string'
        ? err.response.data.error : err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setFormError(message);
      toast({ title: 'Registration failed', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-coders-bg flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-16 h-16 bg-coders-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-coders-green" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Account created</h2>
          <p className="text-muted-foreground mb-6">You can now sign in as <strong>{email}</strong>. Email verification is available when delivery is configured.</p>
          <Button asChild className="bg-coders-green text-black hover:bg-coders-green/90">
            <Link to="/login">Go to Login</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coders-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-coders-green rounded-xl flex items-center justify-center">
              <Code2 className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold gradient-text">CodeForge</span>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground mt-1">Start your coding journey today</p>
        </div>

        <div className="glass-card p-6">
          {formError && <p role="alert" className="mb-4 text-sm text-red-400">{formError}</p>}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required className="bg-coders-surface border-coders-border mt-1" />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="coolcoder123" required minLength={3} maxLength={20}
                pattern="[a-zA-Z0-9_]+" title="Letters, numbers, and underscores only"
                className="bg-coders-surface border-coders-border mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Letters, numbers, underscores only</p>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={8}
                  className="bg-coders-surface border-coders-border pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? strengthColors[strength - 1] : 'bg-coders-border'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{strengthLabels[strength - 1] || 'Too weak'}</p>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full bg-coders-green text-black hover:bg-coders-green/90" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create Account
            </Button>
          </form>
          <SocialLogin />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-coders-green hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
