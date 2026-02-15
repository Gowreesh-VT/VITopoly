'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, doc, collectionGroup } from 'firebase/firestore';
import type { Team, Cohort, Loan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Activity, HandCoins, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GAME_CONFIG } from '@/lib/game-constants';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AdjustCreditScoreDialog } from '@/components/dashboard/adjust-credit-score-dialog';
import { IssueLoanDialog } from '@/components/dashboard/issue-loan-dialog';
import { QrScannerDialog } from '@/components/dashboard/qr-scanner-dialog';
import { AdminTransactionDialog } from '@/components/dashboard/admin-transaction-dialog';
import { useDoc } from '@/firebase';

export default function AdminTeamsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const currSymbol = GAME_CONFIG.CURRENCY_SYMBOL;
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const eventId = userProfile?.eventId;

    // Moderator Logic
    const moderatorCohortQuery = useMemoFirebase(() => (
        user ? query(collection(firestore, 'cohorts'), where('moderatorId', '==', user.uid)) : null
    ), [firestore, user]);
    const { data: moderatorCohorts } = useCollection<Cohort>(moderatorCohortQuery);
    const moderatedCohort = moderatorCohorts?.[0];

    const teamsQuery = useMemoFirebase(() => (
        eventId ? query(collection(firestore, 'events', eventId, 'teams'), orderBy('name')) : null
    ), [firestore, eventId]);
    const { data: teams, isLoading: areTeamsLoading } = useCollection<Team>(teamsQuery);

    const loansQuery = useMemoFirebase(() => (
        eventId ? query(collectionGroup(firestore, 'loans'), where('eventId', '==', eventId)) : null
    ), [firestore, eventId]);
    const { data: loans } = useCollection<Loan>(loansQuery);

    const teamsForDisplay = useMemo(() => {
        if (!teams) return [];
        if (moderatedCohort) {
            return teams.filter(team => moderatedCohort.teamIds.includes(team.id));
        }
        return teams;
    }, [teams, moderatedCohort]);

    const teamsWithActiveLoans = loans?.filter(l => l.status === 'ACTIVE').map(l => l.teamId) ?? [];
    const availableTeamsForLoan = teamsForDisplay.filter(t => !teamsWithActiveLoans.includes(t.id));

    const handleScan = (scannedData: string | null) => {
        if (scannedData) {
            const foundTeam = teamsForDisplay?.find(t => t.id === scannedData);
            if (foundTeam) {
                setSelectedTeam(foundTeam);
                setIsTxDialogOpen(true);
            } else {
                toast({
                    variant: "destructive",
                    title: "Team Not Found",
                    description: "The scanned QR code does not correspond to a valid team in this context.",
                });
            }
        }
    };

    if (areTeamsLoading || !user) return <Skeleton className="h-64 w-full" />;

    return (
        <div className="space-y-6">
             {selectedTeam && eventId && user && (
                <AdminTransactionDialog
                    open={isTxDialogOpen}
                    onOpenChange={setIsTxDialogOpen}
                    team={selectedTeam}
                    activeLoan={loans?.find(l => l.id === selectedTeam.activeLoanId)}
                    adminId={user.uid}
                    eventId={eventId}
                />
            )}

            <div className="flex justify-end gap-2">
                 <QrScannerDialog onScan={handleScan}>
                    <Button>
                        <ScanLine className="mr-2 h-4 w-4" />
                        Scan Team QR
                    </Button>
                </QrScannerDialog>
                <IssueLoanDialog teams={availableTeamsForLoan ?? []} eventId={eventId!} adminId={user!.uid}>
                    <Button variant="secondary" disabled={availableTeamsForLoan.length === 0}>
                        <HandCoins className="mr-2 h-4 w-4" />
                        Issue Loan
                    </Button>
                </IssueLoanDialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Team Balances & Scores</CardTitle>
                    <CardDescription>Overview of all teams{moderatedCohort && " in your cohort"}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Team</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>Credit Score</TableHead>
                                <TableHead className="hidden md:table-cell">Loan Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teamsForDisplay.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No teams found.</TableCell></TableRow>}
                            {teamsForDisplay.map((team) => (
                                <TableRow key={team.id}>
                                    <TableCell className="font-medium">{team.name}</TableCell>
                                    <TableCell>{currSymbol}{team.balance.toLocaleString()}</TableCell>
                                    <TableCell>{team.creditScore}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {team.hasActiveLoan ? <Badge variant="destructive">ACTIVE</Badge> : <Badge variant="secondary">None</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AdjustCreditScoreDialog team={team} adminId={user.uid} eventId={eventId!}>
                                            <Button variant="ghost" size="sm"><Activity className="w-4 h-4 mr-2"/> Adjust</Button>
                                        </AdjustCreditScoreDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
