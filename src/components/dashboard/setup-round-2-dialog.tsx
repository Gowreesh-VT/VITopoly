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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, limit, getDocs } from 'firebase/firestore'; 
import { createCohorts, initializeCohortProperties, resetRound2Data } from '@/lib/setup-helpers';
import { GameConfig } from '@/lib/types';

type SetupRound2DialogProps = {
  children: ReactNode;
  gameConfig: GameConfig;
};

export function SetupRound2Dialog({ children, gameConfig }: SetupRound2DialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const [numCohorts, setNumCohorts] = useState<number>(15);

  async function handleSetup() {
    setLoading(true);
    try {
        // HARDCODED Event ID as per user request to bypass index/detection issues
        const eventId = 'GjBSF3C7Ox7V0zwIyhBP';
        console.log("SetupRound2: Using Hardcoded Event ID:", eventId);

        const cohortCount = await createCohorts(firestore, eventId, numCohorts);
        await initializeCohortProperties(firestore, eventId);

        toast({
            title: 'Round 2 Setup Complete',
            description: `Created ${cohortCount} cohorts and replicated properties.`,
        });
        setOpen(false);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Setup Failed', description: error.message });
    } finally {
        setLoading(false);
    }
  }

  async function handleReset() {
      if (!confirm('DANGER: This will delete ALL cohorts and properties for this event. Are you sure?')) return;
      setLoading(true);
      try {
          const eventId = 'GjBSF3C7Ox7V0zwIyhBP';
          const count = await resetRound2Data(firestore, eventId);
          toast({
              title: 'Reset Complete',
              description: `Deleted ${count} documents (Cohorts/Properties).`,
          });
          setOpen(false);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Reset Failed', description: error.message });
      } finally {
          setLoading(false);
      }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Setup Round 2 Data</DialogTitle>
          <DialogDescription>
            This action will:
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
            <ul className="list-disc ml-4 mb-4">
                <li>Split teams into {numCohorts} cohorts (Max 5 teams/cohort).</li>
                <li>Create property copies for each cohort.</li>
            </ul>
            
            <div className="flex items-center gap-4 mb-4">
               <label htmlFor="numCohorts" className="whitespace-nowrap font-medium">Number of Boards:</label>
               <input 
                 id="numCohorts"
                 type="number" 
                 min={1} 
                 max={50}
                 className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 value={numCohorts}
                 onChange={(e) => setNumCohorts(param => parseInt(e.target.value) || 1)}
               />
            </div>

            <p className="text-sm text-destructive font-bold">Only run this ONCE.</p>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={handleReset} disabled={loading}>
                {loading ? 'Processing...' : 'Reset Data (Delete All)'}
            </Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSetup} disabled={loading}>
                    {loading ? 'Setting up...' : 'Confirm Setup'}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
