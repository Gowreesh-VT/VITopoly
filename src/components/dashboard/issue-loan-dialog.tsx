'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import { useFirestore, issueLoan } from '@/firebase';
import type { Team } from '@/lib/types';

const formSchema = z.object({
  teamId: z.string().min(1, "You must select a team."),
  amount: z.coerce.number().positive("Amount must be positive."),
  reason: z.string().min(3, "Please provide a reason for the loan."),
});

type IssueLoanDialogProps = {
  teams: Team[];
  eventId: string;
  adminId: string;
  children: React.ReactNode;
};

export function IssueLoanDialog({ teams, eventId, adminId, children }: IssueLoanDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamId: '',
      amount: 0,
      reason: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await issueLoan(firestore, {
        eventId,
        adminId,
        teamId: values.teamId,
        amount: values.amount,
        reason: values.reason,
      });

      const team = teams.find(t => t.id === values.teamId);
      toast({
        title: 'Loan Issued',
        description: `Successfully issued a loan of ₹${values.amount.toLocaleString()} to ${team?.name}.`,
      });

      form.reset();
      setOpen(false);

    } catch (error: any) {
      console.error('Failed to issue loan:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Issue Loan',
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
          <DialogTitle>Issue New Loan</DialogTitle>
          <DialogDescription>
            Issue a new loan to a team. This will be reflected in their balance immediately.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Seed funding for new venture" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Issuing...' : 'Issue Loan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
