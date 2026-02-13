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
import { useFirestore } from '@/firebase';
import { creditTeam, debitTeam, repayLoan, adjustTeamCreditScore } from '@/firebase/transactions';
import type { Team, Loan } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Coins, Landmark, Trophy } from 'lucide-react';

const formSchema = z.object({
  amount: z.coerce.number().refine((val) => val !== 0, "Amount must not be zero."),
  reason: z.string().min(5, "A reason of at least 5 characters is required."),
});

type AdminTransactionDialogProps = {
  team: Team;
  activeLoan?: Loan;
  adminId: string;
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminTransactionDialog({ team, activeLoan, adminId, eventId, open, onOpenChange }: AdminTransactionDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('credit');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      reason: '',
    },
  });

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let actionPromise;
      let successMessage = '';
      
      const payload = {
        eventId,
        teamId: team.id,
        adminId,
        amount: values.amount,
        reason: values.reason,
      };

      if (activeTab === 'credit') {
        actionPromise = creditTeam(firestore, payload);
        successMessage = `Credited ${team.name} with $${values.amount.toLocaleString()}.`;
      } else if (activeTab === 'debit') {
        actionPromise = debitTeam(firestore, payload);
        successMessage = `Debited ${team.name} with $${values.amount.toLocaleString()}.`;
      } else if (activeTab === 'score') {
        actionPromise = adjustTeamCreditScore(firestore, payload);
        const change = values.amount > 0 ? 'Increased' : 'Decreased';
        successMessage = `${change} credit score for ${team.name} by ${Math.abs(values.amount)}.`;
      } else {
        throw new Error("Invalid action tab.");
      }

      await actionPromise;
      toast({ title: 'Transaction Successful', description: successMessage });
      handleClose();

    } catch (error: any) {
      console.error("Transaction failed:", error);
      toast({
        variant: 'destructive',
        title: 'Transaction Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  }

  async function handleRepayLoan() {
    if (!activeLoan) return;
    try {
        await repayLoan(firestore, {
            eventId,
            teamId: team.id,
            loanId: activeLoan.id,
            amount: activeLoan.amount,
            adminId,
        });
        toast({
            title: "Loan Repaid",
            description: `${team.name} has successfully repaid their loan of $${activeLoan.amount.toLocaleString()}.`,
        });
        handleClose();
    } catch (error: any) {
        console.error("Loan repayment failed:", error);
        toast({
            variant: 'destructive',
            title: 'Repayment Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction for: {team.name}</DialogTitle>
          <DialogDescription>
            Select an action to perform for this team.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="credit">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="credit">Credit</TabsTrigger>
                <TabsTrigger value="debit">Debit</TabsTrigger>
                <TabsTrigger value="score">Score</TabsTrigger>
                <TabsTrigger value="loan" disabled={!team.hasActiveLoan}>Repay Loan</TabsTrigger>
            </TabsList>
            <TabsContent value="credit">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount to Credit ($)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="reason" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reason for Credit (Reward)</FormLabel>
                                <FormControl><Textarea placeholder="e.g., Prize for winning mini-event" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Crediting...' : 'Confirm Credit'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </TabsContent>
            <TabsContent value="debit">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount to Debit ($)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="reason" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reason for Debit (Penalty)</FormLabel>
                                <FormControl><Textarea placeholder="e.g., Penalty for rule violation" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                             <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Debiting...' : 'Confirm Debit'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </TabsContent>
            <TabsContent value="score">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md mb-2">
                             <Trophy className="h-5 w-5 text-amber-500" />
                             <div>
                                 <p className="text-sm font-medium">Current Score: {team.creditScore}</p>
                                 <p className="text-xs text-muted-foreground">Adjusting score manually will notify the team.</p>
                             </div>
                        </div>
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Score Adjustment (+/-)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g. 10 or -5" {...field} />
                                </FormControl>
                                <FormMessage />
                                <p className="text-xs text-muted-foreground">Positive adds to score, Negative deducts.</p>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="reason" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reason</FormLabel>
                                <FormControl><Textarea placeholder="e.g., Exceptional gameplay / Rule violation" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                             <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Updating...' : 'Update Score'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </TabsContent>
            <TabsContent value="loan">
                <div className="space-y-4 py-4">
                    {activeLoan ? (
                         <Alert>
                            <Landmark className="h-4 w-4" />
                            <AlertTitle>Active Loan Found</AlertTitle>
                            <AlertDescription>
                                <div className="flex justify-between items-center">
                                    <span>Loan Amount:</span>
                                    <span className="font-semibold">${activeLoan.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span>Team Balance:</span>
                                    <span className="font-semibold">${team.balance.toLocaleString()}</span>
                                </div>
                                {team.balance < activeLoan.amount && (
                                     <p className="text-destructive text-xs mt-2">Team has insufficient funds to repay this loan.</p>
                                )}
                            </AlertDescription>
                        </Alert>
                    ) : (
                         <Alert variant="destructive">
                             <Coins className="h-4 w-4" />
                            <AlertTitle>No Active Loan</AlertTitle>
                            <AlertDescription>
                                This team does not currently have an active loan to repay.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
                 <DialogFooter>
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button 
                        onClick={handleRepayLoan} 
                        disabled={!activeLoan || team.balance < activeLoan.amount}
                    >
                        Confirm Repayment
                    </Button>
                </DialogFooter>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
