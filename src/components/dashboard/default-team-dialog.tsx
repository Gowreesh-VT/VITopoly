'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { executeTeamDefault, seizeTeamAssets } from '@/lib/game-logic';
import { useFirestore } from '@/firebase';
import { Team } from '@/lib/types';

interface DefaultTeamDialogProps {
  team: Team;
  adminId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function DefaultTeamDialog({ team, adminId, onSuccess, trigger }: DefaultTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDefault = async () => {
    if (confirmation !== team.name) {
      toast({ variant: 'destructive', title: 'Error', description: 'Confirmation name does not match.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Execute Default (Logs & Status Update)
      await executeTeamDefault(firestore, team.id, adminId, reason || 'Manual Default by Admin');
      
      // 2. Seize Assets (Convert to Tokens) - This handles the property conversion
      const seizedCount = await seizeTeamAssets(firestore, team.id, adminId);

      toast({
        title: 'Team Defaulted',
        description: `Team ${team.name} eliminated. ${seizedCount} properties seized for auction.`,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Default Failed', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive">
            <AlertTriangle className="mr-2 h-4 w-4" /> Declare Bankruptcy
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] border-destructive/50">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Declare Team Bankruptcy
          </DialogTitle>
          <DialogDescription>
            This action is <strong>IRREVERSIBLE</strong>. It will:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Mark <strong>{team.name}</strong> as eliminated.</li>
              <li>Seize all their properties.</li>
              <li>Convert properties into <strong>Auction Tokens</strong>.</li>
              <li>Reset their balance to 0.</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Reason
            </Label>
            <Input
              id="reason"
              placeholder="e.g. Insolvent"
              className="col-span-3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm" className="text-destructive font-semibold">
              Type team name to confirm:
            </Label>
            <Input
              id="confirm"
              placeholder={team.name}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="border-destructive/30 focus-visible:ring-destructive"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={handleDefault} 
            disabled={loading || confirmation !== team.name}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            Confirm Bankruptcy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
