'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, orderBy, collectionGroup, limit } from 'firebase/firestore';
import type { Transaction, Cohort, Team } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { TRANSACTION_TYPES } from '@/lib/types';
import { useState, useMemo } from 'react';
import { GAME_CONFIG } from '@/lib/game-constants';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';
import type { DateRange } from 'react-day-picker';

export default function AdminLogsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const currSymbol = GAME_CONFIG.CURRENCY_SYMBOL;
    
    // Filters
    const [logFilterType, setLogFilterType] = useState<string>('');
    const [logFilterTeam, setLogFilterTeam] = useState<string>('');
    const [logFilterDate, setLogFilterDate] = useState<DateRange | undefined>(undefined);

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const eventId = userProfile?.eventId;

    const moderatorCohortQuery = useMemoFirebase(() => (
        user ? query(collection(firestore, 'cohorts'), where('moderatorId', '==', user.uid)) : null
    ), [firestore, user]);
    const { data: moderatorCohorts } = useCollection<Cohort>(moderatorCohortQuery);
    const moderatedCohort = moderatorCohorts?.[0];

    const teamsQuery = useMemoFirebase(() => (
        eventId ? query(collection(firestore, 'events', eventId, 'teams'), orderBy('name')) : null
    ), [firestore, eventId]);
    const { data: teams } = useCollection<Team>(teamsQuery);

    const transactionsQuery = useMemoFirebase(() => {
        if (!eventId || !user) return null;
        return query(
          collectionGroup(firestore, 'transactions'), 
          where('eventId', '==', eventId),
          where('adminId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
      }, [firestore, eventId, user]);
    const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

    const teamsForDisplay = useMemo(() => {
        if (!teams) return [];
        if (moderatedCohort) {
            return teams.filter(team => moderatedCohort.teamIds.includes(team.id));
        }
        return teams;
    }, [teams, moderatedCohort]);

    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        const cohortTeamIds = moderatedCohort ? new Set(teamsForDisplay.map(t => t.id)) : null;
    
        return transactions.filter(tx => {
          const typeMatch = logFilterType && logFilterType !== 'all' ? tx.type === logFilterType : true;
          const teamMatch = logFilterTeam && logFilterTeam !== 'all' ? tx.fromTeamId === logFilterTeam || tx.toTeamId === logFilterTeam : true;
          
          let dateMatch = true;
          if (logFilterDate?.from) {
              const txDate = new Date(tx.timestamp);
              if (logFilterDate.to) {
                 dateMatch = txDate >= logFilterDate.from && txDate <= logFilterDate.to;
              } else {
                 dateMatch = txDate >= logFilterDate.from;
              }
          }
          
          const cohortMatch = cohortTeamIds ? (tx.fromTeamId && cohortTeamIds.has(tx.fromTeamId)) || (tx.toTeamId && cohortTeamIds.has(tx.toTeamId)) : true;
    
          return typeMatch && teamMatch && dateMatch && cohortMatch;
        });
      }, [transactions, logFilterType, logFilterTeam, logFilterDate, moderatedCohort, teamsForDisplay]);


    if (isLoading) return <Skeleton className="h-96 w-full" />;

    return (
        <Card>
            <CardHeader>
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Log of transactions performed by you{moderatedCohort && " for your cohort"}.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <Select value={logFilterType} onValueChange={setLogFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {TRANSACTION_TYPES.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.replace(/_/g, ' ').toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={logFilterTeam} onValueChange={setLogFilterTeam}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by team..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teamsForDisplay?.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DateRangePicker date={logFilterDate} onDateChange={setLogFilterDate} />
              </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="hidden md:table-cell">Type</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No transactions match filters.</TableCell></TableRow>}
                        {filteredTransactions.map((tx) => (
                            <TableRow key={tx.id}>
                                <TableCell className="hidden md:table-cell">
                                    <Badge variant="secondary" className="capitalize">{tx.type.replace(/_/g, ' ').toLowerCase()}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{tx.reason}</div>
                                    <div className="text-sm text-muted-foreground">{tx.fromTeamName ?? 'Bank'} → {tx.toTeamName ?? 'Bank'}</div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{format(new Date(tx.timestamp), 'PPpp')}</TableCell>
                                <TableCell className="text-right font-medium">{currSymbol}{tx.amount.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
