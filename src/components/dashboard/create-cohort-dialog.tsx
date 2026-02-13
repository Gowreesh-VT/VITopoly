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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking, useFirestore, useUser } from '@/firebase';
import type { Event, Admin, Cohort } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(3, "Cohort name must be at least 3 characters."),
  eventId: z.string().min(1, "You must select an event."),
  moderatorId: z.string().min(1, "You must select a moderator."),
});

type CreateCohortDialogProps = {
  children: ReactNode;
  events: Event[];
  admins: Admin[];
};

export function CreateCohortDialog({ children, events, admins }: CreateCohortDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      eventId: '',
      moderatorId: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const cohortsRef = collection(firestore, 'cohorts');
    const newCohortRef = doc(cohortsRef);

    const newCohort: Cohort = {
        id: newCohortRef.id,
        name: values.name,
        eventId: values.eventId,
        moderatorId: values.moderatorId,
        teamIds: [],
        status: 'WAITING',
    }
    
    setDocumentNonBlocking(newCohortRef, newCohort, {});

    toast({
      title: 'Cohort Created',
      description: `Successfully created the cohort "${values.name}".`,
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
          <DialogTitle>Create New Cohort</DialogTitle>
          <DialogDescription>
            Group teams together into a cohort for an event.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cohort Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cohort Alpha" {...field} />
                  </FormControl>
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
                        <SelectValue placeholder="Select an event" />
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
            <FormField
              control={form.control}
              name="moderatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moderator (Admin)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an admin to moderate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {admins.map(admin => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.name}
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
              <Button type="submit">Create Cohort</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
