'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Bell, User, LogOut, KeyRound, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUser, useAuth, useFirestore, useCollection, useDoc, useMemoFirebase, initiatePasswordReset, markNotificationsAsRead } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { collection, doc, query, where } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const teamId = userProfile?.teamId;
  const eventId = userProfile?.eventId;

  const notificationsQuery = useMemoFirebase(() => {
    if (!teamId || !eventId) return null;
    const baseQuery = collection(firestore, 'events', eventId, 'teams', teamId, 'notifications');
    return query(baseQuery, where('read', '==', false));
  }, [firestore, teamId, eventId]);

  const { data: notifications, isLoading: areNotificationsLoading } = useCollection<Notification>(notificationsQuery);
  const unreadCount = notifications?.length ?? 0;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handlePasswordReset = () => {
    if (user?.email) {
      initiatePasswordReset(auth, user.email);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox to reset your password.",
      });
    } else {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send password reset email. User email not found.",
      });
    }
  }
  
  const handleMarkAsRead = () => {
      if (!firestore || !eventId || !teamId || !notifications || notifications.length === 0) return;
      const notificationIds = notifications.map(n => n.id);
      markNotificationsAsRead(firestore, eventId, teamId, notificationIds);
       toast({
        title: "Notifications Cleared",
        description: "All notifications have been marked as read.",
      });
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <SidebarTrigger className="md:hidden" />

      <h1 className="text-lg font-semibold md:text-xl">{title}</h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                 <span className="absolute top-0 right-0 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="flex items-center justify-between mb-2">
               <p className="font-medium">Notifications</p>
               <Button variant="ghost" size="sm" onClick={handleMarkAsRead} disabled={!notifications || notifications.length === 0}>
                  <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
               </Button>
            </div>
            <div className="flex flex-col gap-2">
                {areNotificationsLoading && <Skeleton className="h-10 w-full" />}
                {!areNotificationsLoading && (!notifications || notifications.length === 0) && (
                    <p className="text-sm text-muted-foreground p-2">No new notifications.</p>
                )}
                {isClient && !areNotificationsLoading && notifications && notifications.map((notif) => (
                    <div key={notif.id} className="grid grid-cols-[25px_1fr] items-start gap-3 rounded-md p-2 hover:bg-muted">
                    <span className="flex h-2 w-2 translate-y-1 rounded-full bg-primary" />
                    <div className="space-y-1 col-start-2">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-sm text-muted-foreground">{notif.message}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}</p>
                    </div>
                    </div>
                ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName ?? ''} />}
                <AvatarFallback>{user?.displayName?.charAt(0) ?? user?.email?.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.displayName ?? user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        <span>Reset Password</span>
                    </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Your Password?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will send a password reset link to your registered email address: <span className="font-medium">{user?.email}</span>. Are you sure you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePasswordReset}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
