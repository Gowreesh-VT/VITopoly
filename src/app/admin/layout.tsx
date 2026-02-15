import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { NavItem } from '@/components/layout/sidebar-nav';

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard/requests', label: 'Requests', icon: 'ListChecks' },
  { href: '/admin/dashboard/game', label: 'Live Game', icon: 'Terminal' },
  { href: '/admin/dashboard/properties', label: 'Properties', icon: 'Building' },
  { href: '/admin/dashboard/teams', label: 'Teams', icon: 'Users' },
  { href: '/admin/dashboard/leaderboard', label: 'Leaderboard', icon: 'Trophy' },
  { href: '/admin/dashboard/logs', label: 'Logs', icon: 'History' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell navItems={adminNavItems} title="Admin Dashboard">
      {children}
    </AppShell>
  );
}
