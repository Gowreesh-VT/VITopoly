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
import { useFirestore, adjustTeamBalance } from '@/firebase';
import type { Team } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be a positive number."),
  reason: z.string().min(5, "A reason of at least 5 characters is required."),
  direction: z.enum(['credit', 'debit'], {
    required_error: "You need to select an adjustment type."
  }),
});

type AdjustBalanceDialogProps = {
  team: Team;
  adminId: string;
  children: ReactNode;
};

export function AdjustBalanceDialog({ team, adminId, children }: AdjustBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      reason: '',
      direction: 'credit'
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        await adjustTeamBalance(firestore, {
            ...values,
            eventId: team.eventId,
            teamId: team.id,
            adminId: adminId,
        });

        toast({
            title: 'Balance Adjusted',
            description: `Successfully adjusted ${team.name}'s balance.`,
        });

        form.reset();
        setOpen(false);

    } catch (error: any) {
        console.error("Failed to adjust balance:", error);
        toast({
            variant: 'destructive',
            title: 'Adjustment Failed',
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
          <DialogTitle>Adjust Balance for {team.name}</DialogTitle>
          <DialogDescription>
            Manually credit or debit a team's balance. This action will be logged as a SUPER ADMIN OVERRIDE.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Adjustment Type</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="credit" />
                            </FormControl>
                            <FormLabel className="font-normal">Credit (Add)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="debit" />
                            </FormControl>
                            <FormLabel className="font-normal">Debit (Subtract)</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                  <FormLabel>Reason for Override</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Prize for winning mini-event" {...field} />
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
                {form.formState.isSubmitting ? 'Adjusting...' : 'Adjust Balance'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
