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
import { useToast } from '@/hooks/use-toast';
import { useFirestore, repayLoan } from '@/firebase';
import type { Team, Loan } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Coins, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type RepayLoanDialogProps = {
  team: Team;
  activeLoan: Loan;
  children: React.ReactNode;
};

export function RepayLoanDialog({ team, activeLoan, children }: RepayLoanDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRepay = team.balance >= activeLoan.amount;

  async function handleRepay() {
    if (!canRepay) return;
    
    setIsSubmitting(true);
    try {
      await repayLoan(firestore, {
        eventId: team.eventId,
        teamId: team.id,
        loanId: activeLoan.id,
        amount: activeLoan.amount,
        // adminId is undefined for self-service
      });

      toast({
        title: 'Loan Repaid',
        description: `Successfully repaid loan of ${formatCurrency(activeLoan.amount)}.`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Failed to repay loan:', error);
      toast({
        variant: 'destructive',
        title: 'Repayment Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Repay Active Loan</DialogTitle>
          <DialogDescription>
            You are about to repay your active loan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">Loan Amount:</span>
                <span className="font-bold text-lg">{formatCurrency(activeLoan.amount)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">Your Balance:</span>
                <span className={`font-bold text-lg ${canRepay ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(team.balance)}
                </span>
            </div>

            {!canRepay && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Insufficient Funds</AlertTitle>
                    <AlertDescription>
                        You need {formatCurrency(activeLoan.amount - team.balance)} more to repay this loan.
                    </AlertDescription>
                </Alert>
            )}

            {canRepay && (
                <Alert>
                    <Coins className="h-4 w-4" />
                    <AlertTitle>Ready to Respay</AlertTitle>
                    <AlertDescription>
                        Repaying this loan will deduct {formatCurrency(activeLoan.amount)} from your balance and restore 5 credit score points.
                    </AlertDescription>
                </Alert>
            )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleRepay} disabled={!canRepay || isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Confirm Repayment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
