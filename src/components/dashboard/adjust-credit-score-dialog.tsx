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
import { adjustTeamCreditScore } from '@/firebase/transactions';
import { useFirestore } from '@/firebase';
import type { Team } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  direction: z.enum(['increase', 'decrease']),
  amount: z.coerce.number().min(1, "Amount must be at least 1."),
  reason: z.string().min(3, "Reason must be at least 3 characters."),
});

type AdjustCreditScoreDialogProps = {
  team: Team;
  adminId: string;
  eventId: string;
  children: ReactNode;
};

export function AdjustCreditScoreDialog({ team, adminId, eventId, children }: AdjustCreditScoreDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      direction: 'increase',
      amount: 5,
      reason: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const finalAmount = values.direction === 'increase' ? values.amount : -values.amount;
        
        await adjustTeamCreditScore(firestore, {
            eventId,
            teamId: team.id,
            adminId,
            amount: finalAmount,
            reason: values.reason,
        });

        toast({
            title: 'Credit Score Updated',
            description: `Successfully ${values.direction}d ${team.name}'s credit score by ${values.amount}.`,
        });
        
        form.reset();
        setOpen(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message || "Could not update credit score.",
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
          <DialogTitle>Adjust Credit Score</DialogTitle>
          <DialogDescription>
            Manually increase or decrease the credit score for <span className="font-semibold">{team.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="increase">Increase Score (+)</SelectItem>
                      <SelectItem value="decrease">Decrease Score (-)</SelectItem>
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
                  <FormLabel>Amount</FormLabel>
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
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Completed bonus challenge" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
