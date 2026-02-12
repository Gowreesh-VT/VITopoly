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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import type { Team, UserProfile } from '@/lib/types';
import { doc, setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { KeyRound } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Must be a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type CreateTeamUserDialogProps = {
  children?: ReactNode;
  team: Team;
};

export function CreateTeamUserDialog({ children, team }: CreateTeamUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    // Use a temporary secondary Firebase app to create the user.
    // This avoids signing out the current super admin.
    let secondaryApp;
    try {
      try {
        secondaryApp = getApp('_teamUserCreator');
      } catch {
        secondaryApp = initializeApp(firebaseConfig, '_teamUserCreator');
      }
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Create the Firebase Auth user via the secondary app
      const credential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password);
      const newUserId = credential.user.uid;

      // Sign out of the secondary app immediately
      await secondaryAuth.signOut();

      // 2. Write the Firestore user profile (uses the main app's firestore)
      try {
        const userProfile: UserProfile = {
          id: newUserId,
          email: values.email,
          displayName: team.name, // Team name is the display name
          role: 'TEAM',
          teamId: team.id,
          eventId: team.eventId,
        };
        
        await setDoc(doc(firestore, 'users', newUserId), userProfile);

      } catch (firestoreError: any) {
        console.error('Firestore profile write failed:', firestoreError);
        toast({
          variant: 'destructive',
          title: 'Partial Creation',
          description: `Auth account created for ${values.email}, but failed to write Firestore profile: ${firestoreError.message}. Use "Promote Existing User" to fix (if implemented for teams) or contact support.`,
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Team Login Created',
        description: `Login created for team "${team.name}" (${values.email}).`,
      });

      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Team user creation failed:', error);
      let description = `An unexpected error occurred: ${error.message ?? error.code}`;
      if (error?.code === 'auth/email-already-in-use') {
        description = 'This email is already registered.';
      } else if (error?.code === 'auth/weak-password') {
        description = 'The password is too weak. Please use at least 6 characters.';
      } else if (error?.code === 'auth/invalid-email') {
        description = 'The email address is invalid.';
      }

      toast({ variant: 'destructive', title: 'Creation Failed', description });
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp).catch(() => {});
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <KeyRound className="mr-2 h-4 w-4" /> Create Login
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Team Login</DialogTitle>
          <DialogDescription>
            Create a login for <strong>{team.name}</strong>. They will use this email and password to access the team dashboard.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={`team-${team.name.toLowerCase().replace(/\s+/g, '-')}@vit.ac.in`} {...field} />
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
                  <FormDescription>At least 6 characters. Share this with the team.</FormDescription>
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
                {isSubmitting ? 'Creating...' : 'Create Login'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
