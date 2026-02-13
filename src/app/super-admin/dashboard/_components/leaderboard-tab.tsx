'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Leaderboard, Cohort, Team } from '@/lib/types';
import { useMemo } from 'react';

interface LeaderboardTabProps {
  leaderboards: Leaderboard[];
  cohorts: Cohort[];
  teams: Team[];
}

export function LeaderboardTab({ leaderboards, cohorts, teams }: LeaderboardTabProps) {
  const rankings = leaderboards[0]?.overallRankings ?? [];

  const clusterLeaders = useMemo(() => {
    if (!rankings.length || !teams.length || !cohorts.length) return [];

    const teamCohortMap = new Map<string, string>(); // teamId -> cohortId
    teams.forEach(t => {
      if (t.cohortId) teamCohortMap.set(t.id, t.cohortId);
    });

    const cohortNameMap = new Map<string, string>(); // cohortId -> name
    cohorts.forEach(c => cohortNameMap.set(c.id, c.name));

    const leaders = new Map<string, { teamName: string, score: number, cohortName: string }>();

    // Rankings are assumed to be sorted by score descending
    for (const rank of rankings) {
      const cohortId = teamCohortMap.get(rank.teamId);
      if (cohortId && !leaders.has(cohortId)) {
        const cohortName = cohortNameMap.get(cohortId) || 'Unknown Cluster';
        leaders.set(cohortId, {
          teamName: rank.teamName,
          score: rank.score,
          cohortName: cohortName
        });
      }
    }

    // Convert map to array and sort by cohort name
    return Array.from(leaders.values()).sort((a, b) => a.cohortName.localeCompare(b.cohortName));
  }, [rankings, teams, cohorts]);

  return (
    <div className="space-y-6">
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
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clusterLeaders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No cluster data available.
                  </TableCell>
                </TableRow>
              )}
              {clusterLeaders.map((leader) => (
                <TableRow key={leader.cohortName}>
                  <TableCell className="font-medium">{leader.cohortName}</TableCell>
                  <TableCell className="font-bold text-amber-600">{leader.teamName}</TableCell>
                  <TableCell>{leader.score.toFixed(2)}</TableCell>
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
    </div>
  );
}
