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
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, useFirestore } from '@/firebase';
import type { Team } from '@/lib/types';
import { doc } from 'firebase/firestore';

const formSchema = z.object({
  newCreditScore: z.coerce.number().min(0, "Credit score must be non-negative."),
});

type CreditScoreOverrideDialogProps = {
  team: Team;
  children: ReactNode;
};

export function CreditScoreOverrideDialog({ team, children }: CreditScoreOverrideDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newCreditScore: team.creditScore,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const teamRef = doc(firestore, 'events', team.eventId, 'teams', team.id);
    
    updateDocumentNonBlocking(teamRef, { creditScore: values.newCreditScore });

    toast({
      title: 'Credit Score Updated',
      description: `Successfully updated ${team.name}'s credit score to ${values.newCreditScore}.`,
    });
    
    form.reset({ newCreditScore: values.newCreditScore });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Override Credit Score</DialogTitle>
          <DialogDescription>
            Manually set a new credit score for <span className="font-semibold">{team.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="newCreditScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Credit Score</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Update Score</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
