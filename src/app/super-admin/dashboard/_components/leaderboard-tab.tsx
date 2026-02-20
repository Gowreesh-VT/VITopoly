'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Leaderboard, Event, Cohort } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { calculateLeaderboard } from '@/lib/game-logic';

interface LeaderboardTabProps {
  leaderboards: Leaderboard[];
  events: Event[];
  cohorts: Cohort[];
}

export function LeaderboardTab({ leaderboards, events, cohorts }: LeaderboardTabProps) {
  const rankings = leaderboards.find(l => !l.cohortId)?.overallRankings ?? [];
  const [isRecalculating, setIsRecalculating] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleRecalculate = async () => {
    // Super admin can recalculate the active event
    const activeEvent = events[0];
    if (!activeEvent) {
        toast({ variant: 'destructive', title: 'Error', description: 'No active event found to recalculate.' });
        return;
    }

    setIsRecalculating(true);
    try {
        await calculateLeaderboard(firestore, activeEvent.id);
        toast({ title: 'Success', description: 'Leaderboard recalculated successfully.' });
    } catch (error: any) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to recalculate: ' + (error.message || 'Unknown error') });
    } finally {
        setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Overall Leaderboard</CardTitle>
            <CardDescription>View current universal rankings. Recalculate manually if needed.</CardDescription>
          </div>
          <Button onClick={handleRecalculate} disabled={isRecalculating} variant="outline" size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
              {isRecalculating ? 'Recalculating...' : 'Recalculate Rankings'}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Cash Balance</TableHead>
                <TableHead>Property Value</TableHead>
                <TableHead>Credit Score</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No ranking data available.
                  </TableCell>
                </TableRow>
              )}
              {rankings.map((entry) => (
                <TableRow key={entry.teamId}>
                  <TableCell className="font-bold text-lg">{entry.rank}</TableCell>
                  <TableCell className="font-medium">{entry.teamName}</TableCell>
                  <TableCell>{formatCurrency(entry.cash)}</TableCell>
                  <TableCell>{formatCurrency(entry.propertyValue)}</TableCell>
                  <TableCell>{entry.creditScore}</TableCell>
                  <TableCell>{entry.score.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cohorts.map((cohort) => {
          const cohortLeaderboard = leaderboards.find(l => l.cohortId === cohort.id);
          const topTeams = (cohortLeaderboard?.rankings || []).slice(0, 2);

          return (
            <Card key={cohort.id}>
              <CardHeader>
                <CardTitle className="text-lg">{cohort.name} Top 2</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topTeams.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground text-sm">
                          No teams found.
                        </TableCell>
                      </TableRow>
                    )}
                    {topTeams.map((entry, idx) => (
                      <TableRow key={entry.teamId}>
                        <TableCell className="font-bold">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{entry.teamName}</TableCell>
                        <TableCell className="text-right">{entry.score.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
