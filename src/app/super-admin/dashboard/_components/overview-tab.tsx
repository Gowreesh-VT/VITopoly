'use client';

import { format } from 'date-fns';
import { doc, setDoc, Firestore } from 'firebase/firestore';
import { DollarSign, Users, Shield, Landmark, TrendingUp, ArrowRightLeft, Gamepad2, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import { UpdateGameStateDialog } from '@/components/dashboard/update-game-state-dialog';
import { useToast } from '@/hooks/use-toast';
import type { GameConfig, Team, Admin, Loan, Transaction } from '@/lib/types';

interface OverviewTabProps {
  firestore: Firestore;
  gameConfig: GameConfig | null;
  teams: Team[];
  admins: Admin[];
  ledger: Transaction[];
  totalVCash: number;
  totalActiveLoans: number;
  averageCreditScore: number;
}

export function OverviewTab({
  firestore,
  gameConfig,
  teams,
  admins,
  ledger,
  totalVCash,
  totalActiveLoans,
  averageCreditScore,
}: OverviewTabProps) {
  const { toast } = useToast();

  const handleInitializeGameState = async () => {
    const gameStateRef = doc(firestore, 'game_config', 'current_event');
    const defaultGameState: GameConfig = {
      id: 'current_event',
      currentRound: 1,
      roundStatus: 'REGISTRATION',
      roundStartTime: new Date().toISOString(),
      roundEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      cashWeight: 0.4,
      propertyWeight: 0.3,
      tokenWeight: 0.2,
      creditWeight: 0.1,
    };
    await setDoc(gameStateRef, defaultGameState);
    toast({ title: 'Game State Initialized', description: 'The global game state has been set to its default values.' });
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-6">
        <StatCard title="V-Cash in Circulation" value={`₹${totalVCash.toLocaleString()}`} icon={<DollarSign />} />
        <StatCard title="Total Active Loans" value={`₹${totalActiveLoans.toLocaleString()}`} icon={<Landmark />} />
        <StatCard title="Avg. Credit Score" value={averageCreditScore} icon={<TrendingUp />} />
        <StatCard title="Total Teams" value={teams.length} icon={<Users />} />
        <StatCard title="Total Admins" value={admins.length} icon={<Shield />} />
        <StatCard title="Total Transactions" value={ledger.length.toLocaleString()} icon={<ArrowRightLeft />} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 /> Global Game State
            </CardTitle>
            <CardDescription>Control the current state of the entire event.</CardDescription>
          </div>
          {gameConfig ? (
            <UpdateGameStateDialog gameConfig={gameConfig}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" /> Update State
              </Button>
            </UpdateGameStateDialog>
          ) : (
            <Button onClick={handleInitializeGameState}>
              <Settings className="mr-2 h-4 w-4" /> Initialize Game State
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {gameConfig ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Current Round</div>
                <div className="font-semibold">{gameConfig.currentRound}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Round Status</div>
                <div className="font-semibold">{gameConfig.roundStatus.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Round Start</div>
                <div className="font-semibold">{format(new Date(gameConfig.roundStartTime), 'Pp')}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Round End</div>
                <div className="font-semibold">{format(new Date(gameConfig.roundEndTime), 'Pp')}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cash Weight</div>
                <div className="font-semibold">{gameConfig.cashWeight}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Property Weight</div>
                <div className="font-semibold">{gameConfig.propertyWeight}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Token Weight</div>
                <div className="font-semibold">{gameConfig.tokenWeight}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Credit Weight</div>
                <div className="font-semibold">{gameConfig.creditWeight}</div>
              </div>
            </div>
          ) : (
            <p>The game state has not been initialized. Click the button above to create the default game state.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
