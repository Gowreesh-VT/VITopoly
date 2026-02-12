import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { NavItem } from '@/components/layout/sidebar-nav';

const teamNavItems: NavItem[] = [
  { href: '/team/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/team/dashboard#properties', label: 'Properties', icon: 'Home' },
  { href: '/team/dashboard#requests', label: 'Requests', icon: 'ArrowRightLeft' },
  { href: '/team/dashboard#history', label: 'History', icon: 'History' },
  { href: '/team/dashboard#loan-status', label: 'Loan Status', icon: 'HandCoins' },
];

export default function TeamLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell navItems={teamNavItems} title="Team Dashboard">
      {children}
    </AppShell>
  );
}
