import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { SocialLogin } from '@/components/SocialLogin';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const oauthErrors: Record<string, string> = {
  not_configured: 'This sign-in provider has not been configured by the app owner. Use email and password for now.',
  cancelled: 'Social sign-in was cancelled. You can try again or use email and password.',
  expired: 'Your sign-in request expired. Please start again.',
  email_unverified: 'The provider must supply a verified email address. Verify your email with the provider or use email and password.',
  account_exists: 'An account with this email already exists. Sign in with your existing method, then connect Google or GitHub in Settings.',
  account_suspended: 'This account is suspended. Contact the app owner for help.',
  provider_error: 'The sign-in provider could not complete your request. Please try again.',
};

function loginError(error: unknown) {
  if (isAxiosError(error) && typeof error.response?.data?.error === 'string') return error.response.data.error;
  return error instanceof Error ? error.message : 'Login failed. Please try again.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [twoFAState, setTwoFAState] = useState<{ required: boolean; tempToken: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [formError, setFormError] = useState('');
  const [searchParams] = useSearchParams();
  const oauthResult = searchParams.get('oauth');
  const isOAuthTwoFactor = oauthResult === 'two_factor';
  const oauthError = oauthResult === 'error' ? oauthErrors[searchParams.get('reason') || ''] || oauthErrors.provider_error : '';
  const twoFactorRequired = Boolean(twoFAState) || isOAuthTwoFactor;

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (oauthResult !== 'success') return;
    let active = true;
    setIsLoading(true);
    useAuthStore.getState().initialize().then(() => {
      if (!active) return;
      if (useAuthStore.getState().user) navigate('/', { replace: true });
      else setFormError('Your sign-in session could not be restored. Please try signing in again.');
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [oauthResult, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsLoading(true);
    try {
      const result = await login(email, password, rememberMe);
      if (result.requiresTwoFactor) {
        setTwoFAState({ required: true, tempToken: result.tempToken! });
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const message = loginError(err);
      setFormError(message);
      toast({ title: 'Login failed', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsLoading(true);
    try {
      const res = isOAuthTwoFactor
        ? await api.post('/auth/oauth/2fa/login', { code: twoFACode })
        : await api.post('/auth/2fa/login', { tempToken: twoFAState!.tempToken, code: twoFACode });
      useAuthStore.getState().setUser(res.data.user);
      useAuthStore.getState().setAccessToken(res.data.accessToken);
      navigate('/');
    } catch (err) {
      const message = loginError(err);
      setFormError(message);
      toast({ title: 'Verification failed', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-coders-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-coders-green rounded-xl flex items-center justify-center">
              <Code2 className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold gradient-text">CodeForge</span>
          </Link>
          <h1 className="text-2xl font-bold">{twoFactorRequired ? 'Two-Factor Auth' : 'Welcome back'}</h1>
          <p className="text-muted-foreground mt-1">
            {twoFactorRequired ? 'Enter your authenticator code' : "Sign in to your account"}
          </p>
        </div>

        <div className="glass-card p-6">
          {(formError || oauthError) && <p role="alert" className="mb-4 text-sm text-red-400">{formError || oauthError}</p>}
          {oauthResult === 'success' && isLoading && <p role="status" className="mb-4 text-sm text-muted-foreground">Finishing sign-in…</p>}
          {twoFactorRequired ? (
            <form onSubmit={handle2FA} className="space-y-4">
              <div>
                <Label htmlFor="authenticator-code">Authenticator Code</Label>
                <Input
                  id="authenticator-code"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  minLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  required
                  className="bg-coders-surface border-coders-border text-center text-2xl tracking-widest font-mono mt-1"
                />
              </div>
              <Button type="submit" className="w-full bg-coders-green text-black hover:bg-coders-green/90" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Verify
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required className="bg-coders-surface border-coders-border mt-1" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-coders-green hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} required className="bg-coders-surface border-coders-border pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-coders-border" />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Remember me for 7 days</Label>
                </div>
                <Button type="submit" className="w-full bg-coders-green text-black hover:bg-coders-green/90" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Sign In
                </Button>
              </form>
              <SocialLogin />
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-coders-green hover:underline">Sign up for free</Link>
        </p>
      </motion.div>
    </div>
  );
}
