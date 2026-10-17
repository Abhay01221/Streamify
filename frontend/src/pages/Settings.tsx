import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, User, Palette, Code2, Bell, Shield, Monitor, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Slider } from '@/components/ui/slider';
import { LinkedAccounts } from '@/components/LinkedAccounts';

export default function SettingsPage() {
  const { user, refreshUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { settings, updateSettings } = useEditorStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profileForm, setProfileForm] = useState({
    displayName: user?.profile?.displayName || '',
    bio: user?.profile?.bio || '',
    location: user?.profile?.location || '',
    website: user?.profile?.website || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState('');

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/settings/sessions').then((r) => r.data),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof profileForm) => api.patch('/users/me', data),
    onSuccess: () => { toast({ title: 'Profile updated' }); refreshUser(); },
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/settings/account', data),
    onSuccess: () => { toast({ title: 'Password updated' }); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
    onError: () => toast({ title: 'Password update failed', variant: 'destructive' }),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/sessions/${id}`),
    onSuccess: () => { toast({ title: 'Session revoked' }); queryClient.invalidateQueries({ queryKey: ['sessions'] }); },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.delete('/settings/account', { data: { password: passwordForm.currentPassword, confirmation: 'DELETE MY ACCOUNT' } }),
    onSuccess: () => { useAuthStore.getState().logout(); window.location.href = '/'; },
    onError: () => toast({ title: 'Account deletion failed', variant: 'destructive' }),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="profile" orientation="vertical" className="flex gap-6">
        <TabsList className="flex flex-col h-auto bg-coders-surface border border-coders-border rounded-xl p-2 w-48 shrink-0">
          {[
            { value: 'profile', icon: User, label: 'Profile' },
            { value: 'appearance', icon: Palette, label: 'Appearance' },
            { value: 'editor', icon: Code2, label: 'Editor' },
            { value: 'notifications', icon: Bell, label: 'Notifications' },
            { value: 'sessions', icon: Monitor, label: 'Sessions' },
            { value: 'danger', icon: AlertTriangle, label: 'Danger Zone' },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}
              className="w-full justify-start gap-2 text-sm data-[state=active]:bg-coders-bg">
              <tab.icon className="w-4 h-4" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1">
          <TabsContent value="profile" className="mt-0">
            <LinkedAccounts />
            <div className="glass-card p-6 space-y-4">
              <h2 className="font-semibold text-lg">Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Display Name</Label>
                  <Input value={profileForm.displayName} onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                    className="bg-coders-surface border-coders-border mt-1" />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    className="bg-coders-surface border-coders-border mt-1" />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full bg-coders-surface border border-coders-border rounded-md p-2 text-sm mt-1 resize-none h-20 focus:outline-none focus:border-coders-green/50" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={profileForm.website} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                  placeholder="https://yoursite.com" className="bg-coders-surface border-coders-border mt-1" />
              </div>
              <Button onClick={() => updateProfileMutation.mutate(profileForm)}
                disabled={updateProfileMutation.isPending}
                className="bg-coders-green text-black hover:bg-coders-green/90">
                Save Changes
              </Button>
            </div>

            <div className="glass-card p-6 space-y-4 mt-4">
              <h2 className="font-semibold text-lg">Change Password</h2>
              <div>
                <Label>Current Password</Label>
                <Input type="password" value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="bg-coders-surface border-coders-border mt-1" />
              </div>
              <div>
                <Label>New Password</Label>
                <Input type="password" value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="bg-coders-surface border-coders-border mt-1" />
              </div>
              <Button onClick={() => updatePasswordMutation.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })}
                disabled={updatePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}>
                Update Password
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="mt-0">
            <div className="glass-card p-6 space-y-6">
              <h2 className="font-semibold text-lg">Appearance</h2>
              <div>
                <Label className="mb-3 block">Theme</Label>
                <div className="flex gap-3">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button key={t} onClick={() => setTheme(t)}
                      className={`px-4 py-2 rounded-lg border text-sm capitalize transition-colors ${
                        theme === t ? 'border-coders-green bg-coders-green/10 text-coders-green' : 'border-coders-border hover:border-coders-green/50'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="editor" className="mt-0">
            <div className="glass-card p-6 space-y-6">
              <h2 className="font-semibold text-lg">Editor Settings</h2>
              <div>
                <Label className="mb-2 block">Font Size: {settings.fontSize}px</Label>
                <Slider value={[settings.fontSize]} onValueChange={([v]) => updateSettings({ fontSize: v })}
                  min={10} max={24} step={1} className="w-64" />
              </div>
              <div>
                <Label className="mb-2 block">Tab Size</Label>
                <div className="flex gap-2">
                  {[2, 4].map((size) => (
                    <button key={size} onClick={() => updateSettings({ tabSize: size })}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                        settings.tabSize === size ? 'border-coders-green bg-coders-green/10 text-coders-green' : 'border-coders-border'
                      }`}>
                      {size} spaces
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Minimap</Label>
                  <p className="text-xs text-muted-foreground">Show code minimap in editor</p>
                </div>
                <Switch checked={settings.minimap} onCheckedChange={(v) => updateSettings({ minimap: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Save</Label>
                  <p className="text-xs text-muted-foreground">Save code every 30 seconds</p>
                </div>
                <Switch checked={settings.autoSave} onCheckedChange={(v) => updateSettings({ autoSave: v })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
            <div className="glass-card p-6 space-y-4">
              <h2 className="font-semibold text-lg">Active Sessions</h2>
              {sessionsData?.sessions?.map((session: { id: string; deviceInfo?: string; ipAddress?: string; lastActiveAt: string }) => (
                <div key={session.id} className="flex items-center justify-between p-3 border border-coders-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{session.deviceInfo || 'Unknown device'}</p>
                    <p className="text-xs text-muted-foreground">{session.ipAddress} · Last active {new Date(session.lastActiveAt).toLocaleDateString()}</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => revokeSessionMutation.mutate(session.id)}>
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="danger" className="mt-0">
            <div className="glass-card p-6 border-red-500/30 space-y-4">
              <h2 className="font-semibold text-lg text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />Danger Zone
              </h2>
              <p className="text-sm text-muted-foreground">
                Deleting your account is permanent and cannot be undone. All your data will be lost.
              </p>
              <div>
                <Label>Type "DELETE MY ACCOUNT" to confirm</Label>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE MY ACCOUNT" className="bg-coders-surface border-red-500/30 mt-1" />
              </div>
              <Button
                variant="destructive"
                disabled={deleteConfirm !== 'DELETE MY ACCOUNT' || deleteAccountMutation.isPending}
                onClick={() => deleteAccountMutation.mutate()}
              >
                Delete Account Permanently
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
