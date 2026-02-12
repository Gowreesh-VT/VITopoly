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
import { Label } from '@/components/ui/label';
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
import { setDocumentNonBlocking, useFirestore } from '@/firebase';
import { ArrowRightLeft } from 'lucide-react';
import type { Team, PaymentRequest } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';

const formSchema = z.object({
  toTeamId: z.string().min(1, "You must select a team to pay."),
  amount: z.coerce.number().positive("Amount must be positive."),
  reason: z.string().min(3, "Please provide a reason for the payment."),
});

type InitiatePaymentDialogProps = {
  fromTeam: Team;
  otherTeams: Team[];
  eventId: string;
};

export function InitiatePaymentDialog({ fromTeam, otherTeams, eventId }: InitiatePaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      toTeamId: '',
      amount: 0,
      reason: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const toTeam = otherTeams.find(t => t.id === values.toTeamId);
    if (!toTeam) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected team not found.' });
      return;
    }
    
    const paymentRequestsRef = collection(firestore, 'events', eventId, 'payment_requests');
    const newRequestRef = doc(paymentRequestsRef);
    
    const newRequest: PaymentRequest = {
      id: newRequestRef.id,
      eventId,
      fromTeamId: fromTeam.id,
      fromTeamName: fromTeam.name,
      toTeamId: toTeam.id,
      toTeamName: toTeam.name,
      amount: values.amount,
      reason: values.reason,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    };

    setDocumentNonBlocking(newRequestRef, newRequest, {});

    toast({
      title: 'Payment Request Sent',
      description: `Your request to pay ${toTeam.name} ₹${values.amount.toLocaleString()} is pending admin approval.`,
    });
    
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Initiate Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Initiate Payment Request</DialogTitle>
          <DialogDescription>
            Request a payment to another team. An admin must approve it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="toTeamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {otherTeams.map(team => (
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
                  <FormLabel>Amount (₹)</FormLabel>
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
                    <Textarea placeholder="e.g., Payment for services rendered" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Send Request</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
