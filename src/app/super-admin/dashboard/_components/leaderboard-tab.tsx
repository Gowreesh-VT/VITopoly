'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Leaderboard } from '@/lib/types';

interface LeaderboardTabProps {
  leaderboards: Leaderboard[];
}

export function LeaderboardTab({ leaderboards }: LeaderboardTabProps) {
  const rankings = leaderboards[0]?.overallRankings ?? [];

  return (
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
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No ranking data available.
                </TableCell>
              </TableRow>
            )}
            {rankings.map((entry) => (
              <TableRow key={entry.teamId}>
                <TableCell className="font-bold text-lg">{entry.rank}</TableCell>
                <TableCell className="font-medium">{entry.teamName}</TableCell>
                <TableCell>{entry.score.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
