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
import { format } from 'date-fns';
import { Wallet, TrendingUp, HandCoins, Activity, ArrowRight, Calendar, Trophy, ShieldCheck, Star, History } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Team, Transaction, Loan, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { InitiatePaymentDialog } from '@/components/dashboard/initiate-payment-dialog';
import { useMemo, useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RepayLoanDialog } from '@/components/dashboard/repay-loan-dialog';

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
    return query(baseQuery, orderBy('timestamp', 'desc'), limit(5));
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
  




  const activeLoan = loans?.[0];

  const isLoading = isUserProfileLoading || isTeamLoading || areTransactionsLoading || areLoansLoading || areOtherTeamsLoading || isEventLoading;

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
  
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Current Balance" value={formatCurrency(team.balance)} icon={<Wallet />} />
        <StatCard title="Credit Score" value={team.creditScore} icon={<TrendingUp />} />

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
              {activeLoan && (
                  <RepayLoanDialog team={team} activeLoan={activeLoan}>
                      <Button variant="outline" className="w-full">
                          <HandCoins className="mr-2 h-4 w-4" />
                          Repay Loan
                      </Button>
                  </RepayLoanDialog>
              )}
            </CardContent>
          </Card>
       </div>
       
      <Card id="history">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
               Latest 5 transactions.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
             <Link href="/team/dashboard/history">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No transactions yet.</TableCell>
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
                    <div className="text-xs text-muted-foreground">
                      {isDebit ? `To: ${tx.toTeamName ?? 'Bank'}` : `From: ${tx.fromTeamName ?? 'Bank'}`}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{isClient ? format(new Date(tx.timestamp), 'PP p') : <Skeleton className="h-4 w-32" />}</TableCell>
                  <TableCell className={`text-right font-medium ${isDebit ? 'text-destructive' : 'text-green-600'}`}>
                    {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
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
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-48 w-full col-span-1" />
        <Skeleton className="h-48 w-full col-span-2" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
