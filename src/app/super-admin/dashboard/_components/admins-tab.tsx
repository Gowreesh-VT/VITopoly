'use client';

import { doc, Firestore } from 'firebase/firestore';
import { UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { AddAdminDialog } from '@/components/dashboard/add-admin-dialog';
import { CreateAdminUserDialog } from '@/components/dashboard/create-admin-user-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Event, UserProfile } from '@/lib/types';

interface AdminsTabProps {
  firestore: Firestore;
  events: Event[];
  users: UserProfile[];
}

export function AdminsTab({ firestore, events, users }: AdminsTabProps) {
  const { toast } = useToast();

  const handleRemoveAdmin = (user: UserProfile) => {
    // Remove the admin doc from the event's admins subcollection
    if (user.eventId) {
      const adminRef = doc(firestore, 'events', user.eventId, 'admins', user.id);
      deleteDocumentNonBlocking(adminRef);
    }
    // Demote the user profile
    const userRef = doc(firestore, 'users', user.id);
    updateDocumentNonBlocking(userRef, { role: 'TEAM', eventId: '' });
    toast({ title: 'Admin Removed', description: `${user.displayName ?? user.email} has been demoted to a TEAM role.` });
  };

  const superAdmins = users.filter((u) => u.role === 'SUPER_ADMIN');
  const adminUsers = users.filter((u) => u.role === 'ADMIN');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>All Admins</CardTitle>
          <CardDescription>Manage system and event administrators.</CardDescription>
        </div>
        <div className="flex gap-2">
          <CreateAdminUserDialog events={events}>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Create Admin User
            </Button>
          </CreateAdminUserDialog>
          <AddAdminDialog events={events} users={users}>
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" /> Promote Existing User
            </Button>
          </AddAdminDialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {superAdmins.map((user) => (
              <TableRow key={user.id} className="bg-muted/50">
                <TableCell className="font-medium">{user.displayName ?? user.email}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge>SUPER ADMIN</Badge>
                </TableCell>
                <TableCell>All Events</TableCell>
                <TableCell className="text-right" />
              </TableRow>
            ))}
            {adminUsers.map((adminUser) => (
              <TableRow key={adminUser.id}>
                <TableCell className="font-medium">{adminUser.displayName ?? adminUser.email}</TableCell>
                <TableCell>{adminUser.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">ADMIN</Badge>
                </TableCell>
                <TableCell>{events.find((e) => e.id === adminUser.eventId)?.name ?? adminUser.eventId ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">Remove</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove the admin{' '}
                          <span className="font-semibold">{adminUser.displayName ?? adminUser.email}</span>. This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveAdmin(adminUser)}>Remove Admin</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
