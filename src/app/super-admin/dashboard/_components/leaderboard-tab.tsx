'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Leaderboard, Cohort, Team, GameConfig } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';
import { calculateLeaderboard } from '@/lib/game-logic';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface LeaderboardTabProps {
  leaderboards: Leaderboard[];
  cohorts: Cohort[];
  teams: Team[];
  gameConfig?: GameConfig;
  eventId?: string;
}

export function LeaderboardTab({ leaderboards, cohorts, teams, gameConfig, eventId }: LeaderboardTabProps) {
  const rankings = leaderboards[0]?.overallRankings ?? [];

  const clusterLeaders = useMemo(() => {
    if (!rankings.length || !teams.length || !cohorts.length) return [];

    const teamCohortMap = new Map<string, string>(); // teamId -> cohortId
    teams.forEach(t => {
      if (t.cohortId) teamCohortMap.set(t.id, t.cohortId);
    });

    const cohortNameMap = new Map<string, string>(); // cohortId -> name
    cohorts.forEach(c => cohortNameMap.set(c.id, c.name));

    const leaders = new Map<string, { teamName: string, score: number, cohortName: string, cash: number, propertyValue: number, creditScore: number }>();

    // Rankings are assumed to be sorted by score descending
    for (const rank of rankings) {
      const cohortId = teamCohortMap.get(rank.teamId);
      if (cohortId && !leaders.has(cohortId)) {
        const cohortName = cohortNameMap.get(cohortId) || 'Unknown Cluster';
        leaders.set(cohortId, {
          teamName: rank.teamName,
          score: rank.score,
          cohortName: cohortName,
          cash: rank.cash,
          propertyValue: rank.propertyValue,
          creditScore: rank.creditScore
        });
      }
    }

    // Convert map to array and sort by cohort name
    return Array.from(leaders.values()).sort((a, b) => a.cohortName.localeCompare(b.cohortName));
  }, [rankings, teams, cohorts]);

  const firestore = useFirestore();
  const { toast } = useToast();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    const targetEventId = eventId || gameConfig?.id;

    if (!targetEventId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Event ID / Game Config not found.' });
      return;
    }
    
    setIsRecalculating(true);
    try {
      await calculateLeaderboard(firestore, targetEventId, gameConfig);
      toast({ title: 'Success', description: 'Leaderboard recalculated successfully.' });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to recalculate leaderboard.' });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleRecalculate} disabled={isRecalculating}>
          <RotateCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
          {isRecalculating ? 'Recalculating...' : 'Recalculate Rankings'}
        </Button>
      </div>

      {/* Cluster Leaders Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cluster Leaders</CardTitle>
          <CardDescription>Top performing team from each cluster.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster</TableHead>
                <TableHead>Top Team</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">Prop Value</TableHead>
                <TableHead className="text-right">Credit Score</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clusterLeaders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No cluster data available.
                  </TableCell>
                </TableRow>
              )}
              {clusterLeaders.map((leader) => (
                <TableRow key={leader.cohortName}>
                  <TableCell className="font-medium">{leader.cohortName}</TableCell>
                  <TableCell className="font-bold text-amber-600">{leader.teamName}</TableCell>
                  <TableCell className="text-right font-mono text-xs">₹{leader.cash?.toLocaleString() ?? 0}</TableCell>
                  <TableCell className="text-right font-mono text-xs">₹{leader.propertyValue?.toLocaleString() ?? 0}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{leader.creditScore ?? 0}</TableCell>
                  <TableCell className="text-right font-bold">{leader.score.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Overall Leaderboard Section */}
      <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>View current rankings. Data is populated by the Scoring Engine Cloud Function.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Cash Balance</TableHead>
              <TableHead className="text-right">Property Value</TableHead>
              <TableHead className="text-right">Credit Score</TableHead>
              <TableHead className="text-right">Total Score</TableHead>
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
                <TableCell className="text-right font-mono">₹{entry.cash?.toLocaleString() ?? 0}</TableCell>
                <TableCell className="text-right font-mono">₹{entry.propertyValue?.toLocaleString() ?? 0}</TableCell>
                <TableCell className="text-right font-mono">{entry.creditScore ?? 0}</TableCell>
                <TableCell className="text-right font-bold text-lg">{entry.score.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      </Card>
    </div>
  );
}
