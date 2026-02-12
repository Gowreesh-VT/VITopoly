import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarNav, type NavItem } from '@/components/layout/sidebar-nav';
import { Logo } from '@/components/logo';
import { GameStatusBanner } from '@/components/dashboard/game-status-banner';

type AppShellProps = {
  children: ReactNode;
  navItems: NavItem[];
  title: string;
};

export function AppShell({ children, navItems, title }: AppShellProps) {
  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav items={navItems} />
        </SidebarContent>
        <SidebarFooter>
          {/* Can add footer content here */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header title={title} />
        <GameStatusBanner />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
