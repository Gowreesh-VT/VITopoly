'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Cohort, Leaderboard } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, RotateCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { calculateLeaderboard } from '@/lib/game-logic';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useGameConfig } from '@/firebase';

export default function AdminLeaderboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isRecalculating, setIsRecalculating] = useState(false);
    const { gameConfig } = useGameConfig();

    const moderatorCohortQuery = useMemoFirebase(() => (
        user ? query(collection(firestore, 'cohorts'), where('moderatorId', '==', user.uid)) : null
    ), [firestore, user]);
    const { data: moderatorCohorts } = useCollection<Cohort>(moderatorCohortQuery);
    const moderatedCohort = moderatorCohorts?.[0];

    const cohortLeaderboardQuery = useMemoFirebase(() => (
        moderatedCohort ? doc(firestore, 'leaderboards', moderatedCohort.id) : null
    ), [firestore, moderatedCohort]);
    const { data: cohortLeaderboard, isLoading } = useDoc<Leaderboard>(cohortLeaderboardQuery);

    const handleRecalculate = async () => {
        if (!moderatedCohort?.eventId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Event ID not found.' });
            return;
        }

        setIsRecalculating(true);
        try {
            await calculateLeaderboard(firestore, moderatedCohort.eventId, gameConfig ?? undefined);
            toast({ title: 'Success', description: 'Leaderboard recalculated successfully.' });
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to recalculate: ' + (error.message || 'Unknown error') });
        } finally {
            setIsRecalculating(false);
        }
    };

    if (!moderatedCohort) {
        return (
            <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Leaderboard is only available for cohort moderators.</p>
            </div>
        );
    }
    
    if (isLoading) return <Skeleton className="h-64 w-full" />;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2"><Trophy/> Cohort Leaderboard</CardTitle>
                    <CardDescription>Current rankings for teams within the <span className='font-semibold'>{moderatedCohort.name}</span> cohort.</CardDescription>
                </div>
                <Button 
                    onClick={handleRecalculate} 
                    disabled={isRecalculating}
                    size="sm"
                    variant="outline"
                >
                    <RotateCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                    {isRecalculating ? 'Recalculating...' : 'Recalculate Rankings'}
                </Button>
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
                            <TableHead className="text-right">Laps</TableHead>
                            <TableHead className="text-right">Total Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!cohortLeaderboard || cohortLeaderboard.rankings.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">No ranking data available for this cohort.</TableCell>
                            </TableRow>
                        )}
                        {cohortLeaderboard?.rankings.map((entry) => (
                            <TableRow key={entry.teamId}>
                                <TableCell className="font-bold text-lg">{entry.rank}</TableCell>
                                <TableCell className="font-medium text-lg">{entry.teamName}</TableCell>
                                <TableCell className="text-right font-mono">₹{entry.cash?.toLocaleString() ?? 0}</TableCell>
                                <TableCell className="text-right font-mono">₹{entry.propertyValue?.toLocaleString() ?? 0}</TableCell>
                                <TableCell className="text-right font-mono">{entry.creditScore ?? 0}</TableCell>
                                <TableCell className="text-right font-mono">{entry.lapsCompleted ?? 0}</TableCell>
                                <TableCell className="text-right font-bold text-lg">{entry.score.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
