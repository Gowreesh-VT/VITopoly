import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { NavItem } from '@/components/layout/sidebar-nav';

const superAdminNavItems: NavItem[] = [
  { href: '/super-admin/dashboard#overview', label: 'Overview', icon: 'LayoutDashboard' },
  { href: '/super-admin/dashboard#events', label: 'Events', icon: 'Calendar' },
  { href: '/super-admin/dashboard#teams', label: 'Teams', icon: 'Users' },
  { href: '/super-admin/dashboard#admins',label: 'Admins', icon: 'Shield' },
  { href: '/super-admin/dashboard#cohorts',label: 'Cohorts', icon: 'Group' },
  { href: '/super-admin/dashboard#properties',label: 'Properties', icon: 'Home' },
  { href: '/super-admin/dashboard#leaderboard', label: 'Leaderboard', icon: 'Trophy' },
  { href: '/super-admin/dashboard#ledger', label: 'Full Ledger', icon: 'BookCopy' },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell navItems={superAdminNavItems} title="Super Admin">
      {children}
    </AppShell>
  );
}
