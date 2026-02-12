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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking, updateDocumentNonBlocking, useFirestore } from '@/firebase';
import type { Event, UserProfile, Admin } from '@/lib/types';
import { doc, writeBatch } from 'firebase/firestore';

const formSchema = z.object({
  userId: z.string().min(1, "You must select a user."),
  eventId: z.string().min(1, "You must select an event."),
});

type AddAdminDialogProps = {
  children: ReactNode;
  events: Event[];
  users: UserProfile[];
};

export function AddAdminDialog({ children, events, users }: AddAdminDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: '',
      eventId: '',
    },
  });

  const availableUsers = users.filter(u => u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedUser = users.find(u => u.id === values.userId);
    const selectedEvent = events.find(e => e.id === values.eventId);

    if (!selectedUser || !selectedEvent) {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid user or event selected.' });
        return;
    }

    const batch = writeBatch(firestore);

    // 1. Create the admin document in the event's subcollection
    const adminRef = doc(firestore, 'events', selectedEvent.id, 'admins', selectedUser.id);
    const newAdmin: Admin = {
        id: selectedUser.id,
        eventId: selectedEvent.id,
        name: selectedUser.displayName,
        email: selectedUser.email,
        role: 'ADMIN',
    }
    batch.set(adminRef, newAdmin);

    // 2. Update the user's profile
    const userRef = doc(firestore, 'users', selectedUser.id);
    batch.update(userRef, {
        role: 'ADMIN',
        eventId: selectedEvent.id,
    });
    
    await batch.commit();

    toast({
      title: 'Admin Added',
      description: `${selectedUser.displayName} is now an admin for ${selectedEvent.name}.`,
    });
    
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Admin</DialogTitle>
          <DialogDescription>
            Assign an existing user as an administrator for an event.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user to promote" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.displayName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {events.map(event => (
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
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Add Admin</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
