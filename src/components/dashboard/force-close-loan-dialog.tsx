'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, forceRepayLoan } from '@/firebase';
import type { Team, Loan } from '@/lib/types';

type ForceCloseLoanDialogProps = {
  team: Team;
  loan: Loan;
  adminId: string;
  children: ReactNode;
};

export function ForceCloseLoanDialog({ team, loan, adminId, children }: ForceCloseLoanDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  async function handleConfirm() {
    try {
      await forceRepayLoan(firestore, {
        eventId: team.eventId,
        teamId: team.id,
        loanId: loan.id,
        adminId: adminId,
      });

      toast({
        title: 'Loan Forced Closed',
        description: `Loan for ${team.name} has been marked as REPAID.`,
      });

      setOpen(false);

    } catch (error: any) {
      console.error("Failed to force close loan:", error);
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will administratively mark the active loan of <span className="font-semibold">₹{loan.amount.toLocaleString()}</span> for team <span className="font-semibold">{team.name}</span> as REPAID. This does not affect their balance and is for record-keeping and emergency overrides only. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Yes, Force Close Loan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
