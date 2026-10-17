import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { socialLoginUrl } from './SocialLogin';
import { Button } from './ui/button';

export function LinkedAccounts() {
  const [search] = useSearchParams();
  const providers = useQuery<{ google: { enabled: boolean }; github: { enabled: boolean } }>({
    queryKey: ['oauth-providers'], queryFn: () => api.get('/auth/providers').then(r => r.data),
  });
  const connections = useQuery<{ google: { connected: boolean }; github: { connected: boolean } }>({
    queryKey: ['linked-accounts'], queryFn: () => api.get('/auth/connections').then(r => r.data),
  });
  return <section className="glass-card p-6 space-y-4 mt-4" aria-label="Connected sign-in accounts">
    <h2 className="font-semibold text-lg">Google and GitHub sign-in</h2>
    <p className="text-sm text-muted-foreground">Connect a provider to your current account to use it next time. Your problems, courses and progress stay with this account.</p>
    {search.get('oauth') === 'linked' && <p role="status" className="text-sm text-coders-green">Sign-in account connected successfully.</p>}
    {connections.isError && <p role="alert" className="text-sm">Could not load your connected accounts. <button className="underline" onClick={() => connections.refetch()}>Retry</button></p>}
    <div className="flex flex-wrap gap-3">{(['google', 'github'] as const).map(provider => {
      const name = provider === 'google' ? 'Google' : 'GitHub';
      const connected = connections.data?.[provider].connected === true;
      return <Button key={provider} type="button" variant="outline" disabled={connected || !providers.data?.[provider].enabled || !connections.data}
        onClick={() => window.location.assign(`${socialLoginUrl(provider)}?link=1`)}>{connected ? `${name} connected` : `Connect ${name}`}</Button>;
    })}</div>
    {providers.data && (!providers.data.google.enabled || !providers.data.github.enabled) && <p className="text-xs text-muted-foreground">Unavailable providers need configuration by the app owner.</p>}
  </section>;
}
