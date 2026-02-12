'use client';

import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import type { Event, Admin, UserProfile } from '@/lib/types';
import { doc, writeBatch } from 'firebase/firestore';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

const formSchema = z.object({
  displayName: z.string().min(1, 'Display name is required.'),
  email: z.string().email('Must be a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  eventId: z.string().min(1, 'You must select an event.'),
});

type CreateAdminUserDialogProps = {
  children: ReactNode;
  events: Event[];
};

export function CreateAdminUserDialog({ children, events }: CreateAdminUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      eventId: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    // Use a temporary secondary Firebase app to create the user.
    // This avoids signing out the current super admin, since
    // createUserWithEmailAndPassword auto-signs-in the new user.
    let secondaryApp;
    try {
      // Reuse or create the secondary app — handles cases where deleteApp failed previously
      try {
        secondaryApp = getApp('_adminCreator');
      } catch {
        secondaryApp = initializeApp(firebaseConfig, '_adminCreator');
      }
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Create the Firebase Auth user via the secondary app
      const credential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password);
      const newUserId = credential.user.uid;

      // Sign out of the secondary app immediately — we don't need its session
      await secondaryAuth.signOut();

      // 2. Write the Firestore documents in a batch (uses the main app's firestore)
      try {
        const batch = writeBatch(firestore);

        const userProfile: UserProfile = {
          id: newUserId,
          email: values.email,
          displayName: values.displayName,
          role: 'ADMIN',
          eventId: values.eventId,
        };
        batch.set(doc(firestore, 'users', newUserId), userProfile);

        const adminDoc: Admin = {
          id: newUserId,
          eventId: values.eventId,
          name: values.displayName,
          email: values.email,
          role: 'ADMIN',
        };
        batch.set(doc(firestore, 'events', values.eventId, 'admins', newUserId), adminDoc);

        await batch.commit();
      } catch (firestoreError: any) {
        console.error('Firestore batch write failed:', firestoreError);
        toast({
          variant: 'destructive',
          title: 'Partial Creation',
          description: `Auth account created for ${values.email}, but failed to write Firestore profile: ${firestoreError.message}. Use "Promote Existing User" to fix.`,
        });
        setIsSubmitting(false);
        return;
      }

      const selectedEvent = events.find((e) => e.id === values.eventId);
      toast({
        title: 'Admin User Created',
        description: `${values.displayName} (${values.email}) has been created as an admin for ${selectedEvent?.name ?? values.eventId}.`,
      });

      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Admin creation failed:', error);
      let description = `An unexpected error occurred: ${error.message ?? error.code}`;
      if (error?.code === 'auth/email-already-in-use') {
        description = 'This email is already registered. Use "Promote Existing User" instead.';
      } else if (error?.code === 'auth/weak-password') {
        description = 'The password is too weak. Please use at least 6 characters.';
      } else if (error?.code === 'auth/invalid-email') {
        description = 'The email address is invalid.';
      }

      toast({ variant: 'destructive', title: 'Creation Failed', description });
    } finally {
      // Always clean up the secondary app
      if (secondaryApp) {
        await deleteApp(secondaryApp).catch(() => {});
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Admin User</DialogTitle>
          <DialogDescription>
            Create a new Firebase account and assign it as an event admin.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@vit.ac.in" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••" {...field} />
                  </FormControl>
                  <FormDescription>At least 6 characters. Share this with the admin.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event to assign" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Admin'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
