'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { TeamQrDialog } from '@/components/dashboard/team-qr-dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { Wallet, TrendingUp, HandCoins, Activity, ArrowRight, Calendar, Trophy, ShieldCheck, Home, Star } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Team, Transaction, Loan, PaymentRequest, Event, Property, Token, Leaderboard } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { InitiatePaymentDialog } from '@/components/dashboard/initiate-payment-dialog';
import { useMemo, useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function TeamDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc(userProfileRef);

  const teamId = userProfile?.teamId;
  const eventId = userProfile?.eventId;

  const eventRef = useMemoFirebase(() => (eventId ? doc(firestore, 'events', eventId) : null), [firestore, eventId]);
  const { data: event, isLoading: isEventLoading } = useDoc<Event>(eventRef);

  const teamRef = useMemoFirebase(() => (teamId && eventId ? doc(firestore, 'events', eventId, 'teams', teamId) : null), [firestore, teamId, eventId]);
  const { data: team, isLoading: isTeamLoading } = useDoc<Team>(teamRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!teamId || !eventId) return null;
    const baseQuery = collection(firestore, 'events', eventId, 'teams', teamId, 'transactions');
    return query(baseQuery, orderBy('timestamp', 'desc'));
  }, [firestore, teamId, eventId]);
  const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const loansQuery = useMemoFirebase(() => {
    if (!teamId || !eventId) return null;
    return query(collection(firestore, 'events', eventId, 'teams', teamId, 'loans'), where('status', '==', 'ACTIVE'));
  }, [firestore, teamId, eventId]);
  const { data: loans, isLoading: areLoansLoading } = useCollection<Loan>(loansQuery);
  
  const allTeamsQuery = useMemoFirebase(() => (
    eventId ? query(collection(firestore, 'events', eventId, 'teams'), where('id', '!=', teamId ?? '')) : null
  ), [firestore, eventId, teamId]);
  const { data: otherTeams, isLoading: areOtherTeamsLoading } = useCollection<Team>(allTeamsQuery);
  
  const propertiesQuery = useMemoFirebase(() => (
    teamId ? query(collection(firestore, 'properties'), where('ownerTeamId', '==', teamId)) : null
  ), [firestore, teamId]);
  const { data: properties, isLoading: arePropertiesLoading } = useCollection<Property>(propertiesQuery);
  
  const tokensQuery = useMemoFirebase(() => (
      teamId ? query(collection(firestore, 'tokens'), where('teamId', '==', teamId)) : null
  ), [firestore, teamId]);
  const { data: tokens, isLoading: areTokensLoading } = useCollection<Token>(tokensQuery);
  const teamTokens = tokens?.[0];

  const leaderboardQuery = useMemoFirebase(() => (
      eventId ? query(collection(firestore, 'leaderboards'), where('eventId', '==', eventId), limit(1)) : null
  ), [firestore, eventId]);
  const { data: leaderboards, isLoading: areLeaderboardsLoading } = useCollection<Leaderboard>(leaderboardQuery);
  const leaderboard = leaderboards?.[0];

  const teamOverallRank = useMemo(() => leaderboard?.overallRankings?.find(r => r.teamId === teamId), [leaderboard, teamId]);
  const teamCohortRank = useMemo(() => leaderboard?.rankings?.find(r => r.teamId === teamId), [leaderboard, teamId]);


  // Queries for payment requests
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


  const activeLoan = loans?.[0];

  const isLoading = isUserProfileLoading || isTeamLoading || areTransactionsLoading || areLoansLoading || areOtherTeamsLoading || areSentRequestsLoading || areReceivedRequestsLoading || isEventLoading || arePropertiesLoading || areTokensLoading || areLeaderboardsLoading;

  if (isLoading || !isClient) {
    return <DashboardSkeleton />;
  }

  if (!team) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome!</CardTitle>
                    <CardDescription>Your account is ready.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>You have not been assigned to a team yet. Please contact an event administrator to get assigned to a team.</p>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  const getStatusVariant = (status: PaymentRequest['status']) => {
    switch (status) {
        case 'PENDING': return 'secondary';
        case 'APPROVED': return 'default';
        case 'REJECTED': return 'destructive';
        default: return 'secondary';
    }
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Current Balance" value={formatCurrency(team.balance)} icon={<Wallet />} />
        <StatCard title="Credit Score" value={team.creditScore} icon={<TrendingUp />} />
        <StatCard title="Overall Rank" value={teamOverallRank ? `#${teamOverallRank.rank}` : 'N/A'} icon={<Trophy />} description={teamOverallRank ? `${teamOverallRank.score.toFixed(2)} pts` : 'Not ranked'} />
        <StatCard title="Cohort Rank" value={teamCohortRank ? `#${teamCohortRank.rank}`: 'N/A'} icon={<Star />} description={teamCohortRank ? `${teamCohortRank.score.toFixed(2)} pts` : 'Not ranked'} />
        <StatCard id="loan-status" title="Loan Status" value={activeLoan ? formatCurrency(activeLoan.amount) : 'None'} icon={<HandCoins />} description={activeLoan ? 'Active loan' : 'No active loans'} />
        <StatCard title="Account Status" value={team.status} icon={<Activity />} />
        <StatCard title="Current Event" value={event?.name ?? 'Loading...'} icon={<Calendar />} />
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your team's QR code and initiate payments.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <TeamQrDialog team={team} />
              <InitiatePaymentDialog fromTeam={team} otherTeams={otherTeams ?? []} eventId={eventId!} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Token Inventory</CardTitle>
                <CardDescription>Your team's special tokens.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-4 rounded-lg border p-4">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    <div>
                        <p className="text-2xl font-bold">{teamTokens?.strategyTokens ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Strategy Tokens</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border p-4">
                    <ShieldCheck className="h-8 w-8 text-accent" />
                    <div>
                        <p className="text-2xl font-bold">{teamTokens?.defenseTokens ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Defense Tokens</p>
                    </div>
                </div>
            </CardContent>
          </Card>
       </div>
       
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card id="properties">
            <CardHeader><CardTitle className="flex items-center gap-2"><Home /> Owned Properties</CardTitle><CardDescription>Properties your team currently owns.</CardDescription></CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>Value</TableHead><TableHead>Rent</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {properties?.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">No properties owned.</TableCell></TableRow>}
                        {properties?.map(prop => (
                            <TableRow key={prop.id}><TableCell className="font-medium">{prop.name}</TableCell><TableCell>{formatCurrency(prop.baseValue)}</TableCell><TableCell>{formatCurrency(prop.rentValue)}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card id="requests">
            <CardHeader><CardTitle>Payment Request History</CardTitle><CardDescription>A log of your incoming and outgoing payment requests.</CardDescription></CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
      </div>


      <Card id="history">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            A record of your recent financial activities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No transactions yet.</TableCell>
                </TableRow>
              )}
              {transactions?.map((tx) => {
                const isDebit = tx.fromTeamId === team.id;
                return (
                <TableRow key={tx.id}>
                  <TableCell>
                    <Badge variant={tx.type === 'REWARD' || tx.type === 'LOAN_ISSUED' || (tx.type === 'SETTLEMENT' && !isDebit) ? 'default' : 'destructive'} className="capitalize">{tx.type.replace(/_/g, ' ').toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{tx.reason}</div>
                    <div className="text-sm text-muted-foreground">
                      {isDebit ? `To: ${tx.toTeamName ?? 'Bank'}` : `From: ${tx.fromTeamName ?? 'Bank'}`}
                    </div>
                  </TableCell>
                  <TableCell>{isClient ? format(new Date(tx.timestamp), 'PPpp') : <Skeleton className="h-4 w-32" />}</TableCell>
                  <TableCell className={`text-right font-medium ${isDebit ? 'text-destructive' : 'text-green-600'}`}>
                    {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {tx.balanceAfterTransaction?.toLocaleString ? formatCurrency(tx.balanceAfterTransaction): '-'}
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><Skeleton className="h-5 w-2/4" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-full mt-2" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/4" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-full mt-2" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/4" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-full mt-2" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-2/4" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-full mt-2" /></CardContent></Card>
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1"><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent className="flex flex-col gap-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent className="grid grid-cols-2 gap-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-1/4" />
          <Skeleton className="h-4 w-2/5" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
