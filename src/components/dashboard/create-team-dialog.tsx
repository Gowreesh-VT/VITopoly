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
import { useFirestore, createTeam, useUser } from '@/firebase';
import type { Event } from '@/lib/types';

const formSchema = z.object({
  teamName: z.string().min(3, "Team name must be at least 3 characters."),
  eventId: z.string().min(1, "You must select an event."),
});

type CreateTeamDialogProps = {
  children: ReactNode;
  events: Event[];
};

export function CreateTeamDialog({ children, events }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: '',
      eventId: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedEvent = events.find(e => e.id === values.eventId);
    if (!selectedEvent || !user) {
        toast({ variant: "destructive", title: "Error", description: "Selected event not found or user not logged in."})
        return;
    }

    try {
        await createTeam(firestore, {
            eventId: values.eventId,
            teamName: values.teamName,
            initialBalance: selectedEvent.initialTeamBalance,
            adminId: user.uid
        });

        toast({
            title: 'Team Created',
            description: `Successfully created team "${values.teamName}" in event "${selectedEvent.name}".`
        });

        form.reset();
        setOpen(false);

    } catch (error: any) {
        console.error("Failed to create team:", error);
        toast({
            variant: 'destructive',
            title: 'Creation Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team and assign them to an event. Their opening balance will be set by the event.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="teamName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., The High Rollers" {...field} />
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
                        <SelectValue placeholder="Select an event to join" />
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
