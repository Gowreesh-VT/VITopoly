'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, ArrowRightLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import type { Team, PaymentRequest } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { InitiatePaymentDialog } from '@/components/dashboard/initiate-payment-dialog';

export default function RequestsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const teamId = userProfile?.teamId;
  const eventId = userProfile?.eventId;

  const teamRef = useMemoFirebase(() => (teamId && eventId ? doc(firestore, 'events', eventId, 'teams', teamId) : null), [firestore, teamId, eventId]);
  const { data: team } = useDoc<Team>(teamRef);

  const allTeamsQuery = useMemoFirebase(() => (
    eventId ? query(collection(firestore, 'events', eventId, 'teams'), where('id', '!=', teamId ?? '')) : null
  ), [firestore, eventId, teamId]);
  const { data: otherTeams } = useCollection<Team>(allTeamsQuery);

  const sentRequestsQuery = useMemoFirebase(() => (
      teamId && eventId ? query(collection(firestore, 'events', eventId, 'payment_requests'), where('fromTeamId', '==', teamId), orderBy('timestamp', 'desc')) : null
  ), [firestore, eventId, teamId]);
  const { data: sentRequests, isLoading: areSentRequestsLoading } = useCollection<PaymentRequest>(sentRequestsQuery);

  const receivedRequestsQuery = useMemoFirebase(() => (
      teamId && eventId ? query(collection(firestore, 'events', eventId, 'payment_requests'), where('toTeamId', '==', teamId), orderBy('timestamp', 'desc')) : null
  ), [firestore, eventId, teamId]);
  const { data: receivedRequests, isLoading: areReceivedRequestsLoading } = useCollection<PaymentRequest>(receivedRequestsQuery);

  const allRequests = useMemo(() => {
    const combined = [...(sentRequests ?? []), ...(receivedRequests ?? [])];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sentRequests, receivedRequests]);

  const isLoading = areSentRequestsLoading || areReceivedRequestsLoading;

  const getStatusVariant = (status: PaymentRequest['status']) => {
    switch (status) {
        case 'PENDING': return 'secondary';
        case 'APPROVED': return 'default';
        case 'REJECTED': return 'destructive';
        default: return 'secondary';
    }
  }

  if (!isClient || !team) return <RequestsSkeleton />;

  return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Payment Requests</h2>
                <p className="text-muted-foreground">Manage your incoming and outgoing payment requests.</p>
            </div>
            <InitiatePaymentDialog fromTeam={team} otherTeams={otherTeams ?? []} eventId={eventId!} />
        </div>

        <Card id="requests">
            <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5"/> Request History</CardTitle><CardDescription>A log of your financial interactions.</CardDescription></CardHeader>
            <CardContent>
                {isLoading ? <RequestsSkeleton /> : (
                <Table>
                    <TableHeader><TableRow><TableHead>Details</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {allRequests.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No payment requests found.</TableCell></TableRow>}
                        {allRequests.map(req => (
                            <TableRow key={req.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{req.fromTeamId === team.id ? "You" : req.fromTeamName}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{req.toTeamId === team.id ? "You" : req.toTeamName}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{req.reason}</div>
                                </TableCell>
                                <TableCell>{formatCurrency(req.amount)}</TableCell>
                                <TableCell><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                                <TableCell>{isClient ? formatDistanceToNow(new Date(req.timestamp), { addSuffix: true }) : <Skeleton className="h-4 w-20" />}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
      </div>
  );
}

function RequestsSkeleton() {
    return (
        <div className="space-y-4">
             <Skeleton className="h-12 w-full" />
             <Skeleton className="h-64 w-full" />
        </div>
    )
}
