'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ScanLine,
  ListChecks,
  Users,
  HandCoins,
  History,
  QrCode,
  ArrowRightLeft,
  BookCopy,
  Shield,
  Settings,
  Calendar,
  Group,
  Home,
  Trophy,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ScanLine,
  ListChecks,
  Users,
  HandCoins,
  History,
  QrCode,
  ArrowRightLeft,
  BookCopy,
  Shield,
  Settings,
  Calendar,
  Group,
  Home,
  Trophy,
};

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  isActive?: boolean;
};

type SidebarNavProps = {
  items: NavItem[];
};

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState('');

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        if (!Icon) {
          return null;
        }
        // For hash-based hrefs, match both the pathname and hash
        const [itemPath, itemHash] = item.href.split('#');
        const isActive = item.isActive ?? (
          itemHash
            ? pathname === itemPath && hash === `#${itemHash}`
            : pathname === item.href
        );
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={{ children: item.label }}
            >
              <Link href={item.href}>
                <Icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
