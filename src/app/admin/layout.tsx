import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { NavItem } from '@/components/layout/sidebar-nav';

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/admin/dashboard#requests', label: 'Pending Requests', icon: 'ListChecks' },
  { href: '/admin/dashboard#teams', label: 'Team Balances', icon: 'Users' },
  { href: '/admin/dashboard#cohort-leaderboard', label: 'Cohort Leaderboard', icon: 'Trophy'},
  { href: '/admin/dashboard#log', label: 'Transaction Log', icon: 'History' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell navItems={adminNavItems} title="Admin Dashboard">
      {children}
    </AppShell>
  );
}
