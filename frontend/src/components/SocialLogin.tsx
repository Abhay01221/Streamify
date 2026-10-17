import { useEffect, useState } from 'react';
import { Github } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Provider = 'google' | 'github';
type Providers = Record<Provider, { enabled: boolean }>;

// Keep navigation outside the API client: OAuth must navigate the browser to
// the provider and include the API origin when the frontend is hosted separately.
export function socialLoginUrl(provider: Provider, baseURL = api.defaults?.baseURL || '/api') {
  return `${baseURL.replace(/\/$/, '')}/auth/${provider}`;
}

export function SocialLogin() {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await api.get('/auth/providers');
        if (active) setProviders(response.data);
      } catch {
        if (active) setFailed(true);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="mt-6 border-t border-coders-border pt-5">
      <p className="mb-3 text-center text-xs text-muted-foreground">Or continue with</p>
      <div className="grid grid-cols-2 gap-3">
        {(['google', 'github'] as const).map(provider => {
          const name = provider === 'google' ? 'Google' : 'GitHub';
          const enabled = providers?.[provider]?.enabled === true;
          return (
            <div key={provider}><Button type="button" variant="outline" disabled={!enabled} className="w-full"
              onClick={() => window.location.assign(socialLoginUrl(provider))}
              aria-label={enabled ? `Continue with ${name}` : `${name} sign-in unavailable`}>
              {provider === 'github' ? <Github className="mr-2 h-4 w-4" /> : <span aria-hidden="true" className="mr-2 font-bold">G</span>}
              {name}
            </Button>{providers && !enabled && <p className="mt-1 text-center text-xs text-muted-foreground">Sign-in unavailable</p>}</div>
          );
        })}
      </div>
      {!providers && !failed && <p role="status" className="mt-3 text-center text-xs text-muted-foreground">Checking sign-in options…</p>}
      {failed && <p className="mt-3 text-center text-xs text-muted-foreground">Social sign-in is temporarily unavailable. You can use your email and password.</p>}
      {providers && (!providers.google?.enabled || !providers.github?.enabled) && <p className="mt-3 text-center text-xs text-muted-foreground">Unavailable sign-in options need to be configured by the app owner. You can use your email and password.</p>}
    </div>
  );
}
