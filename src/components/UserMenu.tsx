import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';

const UserMenu: React.FC = () => {
  const { user, profile, roles, signOut } = useAuth();
  if (!user) return null;

  const initials = (profile?.display_name || user.email || '?').slice(0, 2).toUpperCase();
  const primaryRole = roles[0] || 'viewer';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
            {initials}
          </span>
          <span className="hidden sm:inline">{profile?.display_name || user.email}</span>
          <span className="stat-badge bg-secondary text-xs capitalize">{primaryRole}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium">{profile?.display_name || 'User'}</span>
          <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <ShieldCheck className="h-3.5 w-3.5 mr-2" />
          Roles: {roles.join(', ') || 'viewer'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <UserIcon className="h-3.5 w-3.5 mr-2" />
          Org: {profile?.org_id?.slice(0, 8) || '—'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
