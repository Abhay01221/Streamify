import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, ChevronDown, Code2, Command, LogOut, Moon, Settings,
  Sun, Trophy, User, Zap, Menu, X
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function Header() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;

  const navLinks = [
    { to: '/problems', label: 'Problems' },
    { to: '/contest', label: 'Contest' },
    { to: '/study-plan', label: 'Courses' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-coders-border bg-coders-bg/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-coders-green rounded-lg flex items-center justify-center">
            <Code2 className="w-5 h-5 text-black" />
          </div>
          <span className="gradient-text">CodeForge</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Command palette hint */}
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="hidden md:flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground border border-coders-border rounded-md hover:border-coders-green/50 transition-colors"
          >
            <Command className="w-3 h-3" />
            <span>K</span>
          </button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {user ? (
            <>
              {/* Notifications */}
              <Link to="/settings" className="relative">
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coders-green text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-white/5 rounded-md px-2 py-1 transition-colors">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={user.profile?.avatarUrl} />
                      <AvatarFallback className="bg-coders-green text-black text-xs font-bold">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-sm font-medium">{user.username}</span>
                    {user.isPremium && (
                      <Badge className="hidden md:flex bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1 py-0">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />PRO
                      </Badge>
                    )}
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-coders-surface border-coders-border">
                  <DropdownMenuItem asChild>
                    <Link to={`/u/${user.username}`} className="flex items-center gap-2">
                      <User className="w-4 h-4" />Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />Settings
                    </Link>
                  </DropdownMenuItem>
                  {!user.isPremium && (
                    <DropdownMenuItem asChild>
                      <Link to="/premium" className="flex items-center gap-2 text-yellow-400">
                        <Zap className="w-4 h-4" />Upgrade to Pro
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 text-coders-orange">
                          <Trophy className="w-4 h-4" />Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { logout(); navigate('/'); }}
                    className="flex items-center gap-2 text-red-400"
                  >
                    <LogOut className="w-4 h-4" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" className="bg-coders-green text-black hover:bg-coders-green/90" asChild>
                <Link to="/register">Sign Up</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden w-8 h-8"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-coders-border bg-coders-surface px-4 py-3 space-y-1"
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md"
            >
              {link.label}
            </Link>
          ))}
        </motion.div>
      )}
    </header>
  );
}
