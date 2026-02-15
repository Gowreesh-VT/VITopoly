'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { PaymentRequest, Cohort, Team } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight, RotateCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { approvePaymentRequest, rejectPaymentRequest } from '@/firebase/transactions';
import { GAME_CONFIG } from '@/lib/game-constants';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function AdminRequestsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const currSymbol = GAME_CONFIG.CURRENCY_SYMBOL;

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const eventId = userProfile?.eventId;

    const moderatorCohortQuery = useMemoFirebase(() => (
        user ? query(collection(firestore, 'cohorts'), where('moderatorId', '==', user.uid)) : null
    ), [firestore, user]);
    const { data: moderatorCohorts } = useCollection<Cohort>(moderatorCohortQuery);
    const moderatedCohort = moderatorCohorts?.[0];

    const paymentRequestsQuery = useMemoFirebase(() => (
        eventId ? query(collection(firestore, 'events', eventId, 'payment_requests'), where('status', '==', 'PENDING'), orderBy('timestamp', 'desc')) : null
    ), [firestore, eventId]);
    const { data: paymentRequests, isLoading: arePaymentRequestsLoading } = useCollection<PaymentRequest>(paymentRequestsQuery);

    const teamsQuery = useMemoFirebase(() => (
        eventId ? query(collection(firestore, 'events', eventId, 'teams'), orderBy('name')) : null
    ), [firestore, eventId]);
    const { data: teams } = useCollection<Team>(teamsQuery);

    const filteredPaymentRequests = useMemo(() => {
        if (!paymentRequests || !teams) return [];
        if (moderatedCohort) {
            const cohortTeamIds = new Set(teams.filter(t => moderatedCohort.teamIds.includes(t.id)).map(t => t.id));
            return paymentRequests.filter(req => cohortTeamIds.has(req.fromTeamId) || cohortTeamIds.has(req.toTeamId));
        }
        return paymentRequests;
    }, [paymentRequests, moderatedCohort, teams]);


    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    const handleApprove = async (req: PaymentRequest) => {
        if (!user || processingIds.has(req.id)) return;
        setProcessingIds(prev => new Set(prev).add(req.id));
        try {
            await approvePaymentRequest(firestore, req, user.uid);
            toast({ title: "Request Approved", description: `Payment processed.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Approval Failed", description: error?.message });
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(req.id);
                return next;
            });
        }
    };

    const handleReject = async (req: PaymentRequest) => {
        if (processingIds.has(req.id)) return;
        setProcessingIds(prev => new Set(prev).add(req.id));
        try {
            await rejectPaymentRequest(firestore, req);
            toast({ title: "Request Rejected", description: `Payment rejected.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Rejection Failed", description: "Could not reject request." });
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(req.id);
                return next;
            });
        }
    };

    if (arePaymentRequestsLoading) return <Skeleton className="h-64 w-full" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Payment Requests</CardTitle>
                <CardDescription>Approve or reject team-to-team payments{moderatedCohort && " within your cohort"}.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Request</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="hidden md:table-cell">Time</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPaymentRequests.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No pending requests.</TableCell></TableRow>}
                        {filteredPaymentRequests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{req.fromTeamName}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{req.toTeamName}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{req.reason}</div>
                                </TableCell>
                                <TableCell>{currSymbol}{req.amount.toLocaleString()}</TableCell>
                                <TableCell className="hidden md:table-cell">{formatDistanceToNow(new Date(req.timestamp), { addSuffix: true })}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleApprove(req)}
                                        disabled={processingIds.has(req.id)}
                                    >
                                        {processingIds.has(req.id) ? (
                                            <RotateCw className="h-4 w-4 animate-spin text-muted-foreground" />
                                        ) : (
                                            <Check className="h-4 w-4 text-green-600" />
                                        )}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleReject(req)}
                                        disabled={processingIds.has(req.id)}
                                    >
                                        <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
