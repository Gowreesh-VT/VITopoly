'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import type { Team, Transaction } from '@/lib/types';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function HistoryPage() {
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

  const transactionsQuery = useMemoFirebase(() => {
    if (!teamId || !eventId) return null;
    const baseQuery = collection(firestore, 'events', eventId, 'teams', teamId, 'transactions');
    return query(baseQuery, orderBy('timestamp', 'desc'));
  }, [firestore, teamId, eventId]);
  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  if (!isClient) return <HistorySkeleton />;

  return (
      <div className="flex flex-col gap-6">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Transaction History</h2>
            <p className="text-muted-foreground">A complete record of your financial activities.</p>
        </div>

      <Card id="history">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Recent Transactions</CardTitle>
          <CardDescription>
            View all incoming and outgoing transactions.
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
              {isLoading && <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>}
              {!isLoading && transactions?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No transactions yet.</TableCell>
                </TableRow>
              )}
              {transactions?.map((tx) => {
                const isDebit = team ? tx.fromTeamId === team.id : false;
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
                    {tx.balanceAfterTransaction ? formatCurrency(tx.balanceAfterTransaction): '-'}
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

function HistorySkeleton() {
    return (
        <div className="space-y-4">
             <Skeleton className="h-12 w-full" />
             <Skeleton className="h-64 w-full" />
        </div>
    )
}
