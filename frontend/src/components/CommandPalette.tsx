import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Code2, Trophy, BookOpen, Users, Settings, Zap, Search } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setOpen(true);
    document.addEventListener('open-command-palette', handler);
    return () => document.removeEventListener('open-command-palette', handler);
  }, []);

  const { data } = useQuery({
    queryKey: ['problems-search', search],
    queryFn: () => api.get(`/problems?search=${search}&limit=5`).then((r) => r.data),
    enabled: search.length > 1,
  });

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 bg-coders-surface border-coders-border max-w-xl overflow-hidden">
        <Command className="bg-transparent" shouldFilter={false}>
          <div className="flex items-center border-b border-coders-border px-3">
            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search problems, navigate..."
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="text-xs text-muted-foreground border border-coders-border rounded px-1.5 py-0.5">ESC</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            {search.length > 1 && data?.problems?.length > 0 && (
              <Command.Group heading="Problems" className="text-xs text-muted-foreground px-2 py-1">
                {data.problems.map((p: { slug: string; number: number; title: string; difficulty: string }) => (
                  <Command.Item
                    key={p.slug}
                    onSelect={() => go(`/problems/${p.slug}`)}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-white/5 text-sm"
                  >
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{p.number}.</span>
                    <span>{p.title}</span>
                    <span className={`ml-auto text-xs ${
                      p.difficulty === 'EASY' ? 'text-green-400' :
                      p.difficulty === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                    }`}>{p.difficulty}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Navigate" className="text-xs text-muted-foreground px-2 py-1">
              {[
                { icon: Code2, label: 'Problems', path: '/problems' },
                { icon: Trophy, label: 'Contests', path: '/contest' },
                { icon: BookOpen, label: 'Courses', path: '/study-plan' },
                { icon: Users, label: 'Leaderboard', path: '/leaderboard' },
                { icon: Zap, label: 'Premium', path: '/premium' },
                { icon: Settings, label: 'Settings', path: '/settings' },
              ].map((item) => (
                <Command.Item
                  key={item.path}
                  onSelect={() => go(item.path)}
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-white/5 text-sm"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
