'use client';
import { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, isWithinInterval } from 'date-fns';
import { ScanLine, HandCoins, Check, X, ArrowRight, Group, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrScannerDialog } from '@/components/dashboard/qr-scanner-dialog';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, approvePaymentRequest, rejectPaymentRequest } from '@/firebase';
import { doc, collection, collectionGroup, query, where, orderBy, limit } from 'firebase/firestore';
import type { Team, Transaction, PaymentRequest, Loan, TransactionType, Cohort, Leaderboard } from '@/lib/types';
import { TRANSACTION_TYPES } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { IssueLoanDialog } from '@/components/dashboard/issue-loan-dialog';
import { AdminTransactionDialog } from '@/components/dashboard/admin-transaction-dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';

export default function AdminDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('requests');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // State for log filters
  const [logFilterType, setLogFilterType] = useState<string>('');
  const [logFilterTeam, setLogFilterTeam] = useState<string>('');
  const [logFilterDate, setLogFilterDate] = useState<DateRange | undefined>(undefined);


  useEffect(() => {
    setIsClient(true);
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['requests', 'teams', 'log', 'cohort-leaderboard'];
    if (validTabs.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc(userProfileRef);
  const eventId = userProfile?.eventId;

  // Check if the current admin is a moderator of a cohort
  const moderatorCohortQuery = useMemoFirebase(() => (
    user ? query(collection(firestore, 'cohorts'), where('moderatorId', '==', user.uid), limit(1)) : null
  ), [firestore, user]);
  const { data: moderatorCohorts, isLoading: areModeratorCohortsLoading } = useCollection<Cohort>(moderatorCohortQuery);
  const moderatedCohort = useMemo(() => moderatorCohorts?.[0], [moderatorCohorts]);
  
  const cohortLeaderboardQuery = useMemoFirebase(() => (
      moderatedCohort ? doc(firestore, 'leaderboards', moderatedCohort.id) : null
  ), [firestore, moderatedCohort]);
  const { data: cohortLeaderboard, isLoading: isCohortLeaderboardLoading } = useDoc<Leaderboard>(cohortLeaderboardQuery);

  const paymentRequestsQuery = useMemoFirebase(() => (
    eventId ? query(collection(firestore, 'events', eventId, 'payment_requests'), where('status', '==', 'PENDING'), orderBy('timestamp', 'desc')) : null
  ), [firestore, eventId]);
  const { data: paymentRequests, isLoading: arePaymentRequestsLoading } = useCollection<PaymentRequest>(paymentRequestsQuery);

  const teamsQuery = useMemoFirebase(() => (
    eventId ? query(collection(firestore, 'events', eventId, 'teams'), orderBy('name')) : null
  ), [firestore, eventId]);
  const { data: teams, isLoading: areTeamsLoading } = useCollection<Team>(teamsQuery);
  
  const loansQuery = useMemoFirebase(() => (
    eventId ? query(collectionGroup(firestore, 'loans'), where('eventId', '==', eventId)) : null
  ), [firestore, eventId]);
  const { data: loans, isLoading: areLoansLoading } = useCollection<Loan>(loansQuery);
  
  const transactionsQuery = useMemoFirebase(() => {
    if (!eventId || !user) return null;
    return query(
      collectionGroup(firestore, 'transactions'), 
      where('eventId', '==', eventId),
      where('adminId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, eventId, user]);
  const { data: transactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

  // Filter all data based on whether the user is a moderator
  const teamsForDisplay = useMemo(() => {
    if (!teams) return [];
    if (moderatedCohort) {
      return teams.filter(team => moderatedCohort.teamIds.includes(team.id));
    }
    return teams;
  }, [teams, moderatedCohort]);
  
  const filteredPaymentRequests = useMemo(() => {
      if (!paymentRequests) return [];
      if (moderatedCohort) {
          const cohortTeamIds = new Set(teamsForDisplay.map(t => t.id));
          return paymentRequests.filter(req => cohortTeamIds.has(req.fromTeamId) || cohortTeamIds.has(req.toTeamId));
      }
      return paymentRequests;
  }, [paymentRequests, moderatedCohort, teamsForDisplay]);
  
  const filteredLoans = useMemo(() => {
      if (!loans) return [];
      if (moderatedCohort) {
          const cohortTeamIds = new Set(teamsForDisplay.map(t => t.id));
          return loans.filter(loan => cohortTeamIds.has(loan.teamId));
      }
      return loans;
  }, [loans, moderatedCohort, teamsForDisplay]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const cohortTeamIds = moderatedCohort ? new Set(teamsForDisplay.map(t => t.id)) : null;

    return transactions.filter(tx => {
      const typeMatch = logFilterType && logFilterType !== 'all' ? tx.type === logFilterType : true;
      const teamMatch = logFilterTeam && logFilterTeam !== 'all' ? tx.fromTeamId === logFilterTeam || tx.toTeamId === logFilterTeam : true;
      const dateMatch = logFilterDate?.from && logFilterDate?.to 
        ? isWithinInterval(new Date(tx.timestamp), { start: logFilterDate.from, end: logFilterDate.to }) 
        : true;
      
      const cohortMatch = cohortTeamIds ? (tx.fromTeamId && cohortTeamIds.has(tx.fromTeamId)) || (tx.toTeamId && cohortTeamIds.has(tx.toTeamId)) : true;

      return typeMatch && teamMatch && dateMatch && cohortMatch;
    });
  }, [transactions, logFilterType, logFilterTeam, logFilterDate, moderatedCohort, teamsForDisplay]);

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
          description: "The scanned QR code does not correspond to a valid team in this event/cohort.",
        });
      }
    }
  };

  const handleApprove = async (req: PaymentRequest) => {
    if (!user) return;
    try {
      await approvePaymentRequest(firestore, req, user.uid);
      toast({
        title: "Request Approved",
        description: `Payment from ${req.fromTeamName} to ${req.toTeamName} has been processed.`,
      });
    } catch (error: any) {
      console.error("Failed to approve payment request:", error);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error?.message || "Could not process the payment.",
      });
    }
  };

  const handleReject = async (req: PaymentRequest) => {
    try {
      await rejectPaymentRequest(firestore, req);
      toast({
        title: "Request Rejected",
        description: `Payment from ${req.fromTeamName} to ${req.toTeamName} has been rejected.`,
      });
    } catch (error: any) {
       console.error("Failed to reject payment request:", error);
       toast({
        variant: "destructive",
        title: "Rejection Failed",
        description: "Could not reject the payment request.",
      });
    }
  };


  const isLoading = isUserProfileLoading || arePaymentRequestsLoading || areTeamsLoading || areLoansLoading || areTransactionsLoading || areModeratorCohortsLoading || isCohortLeaderboardLoading;

  if (isLoading || !isClient || !user) {
    return <DashboardSkeleton isModerator={!!moderatedCohort} />;
  }
  
  const teamsWithActiveLoans = filteredLoans?.filter(l => l.status === 'ACTIVE').map(l => l.teamId) ?? [];
  const availableTeamsForLoan = teamsForDisplay.filter(t => !teamsWithActiveLoans.includes(t.id));

  return (
    <div className="flex flex-col gap-6">
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Welcome, {moderatedCohort ? "Moderator" : "Admin"}!</h1>
        <div className="flex gap-2">
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
      </div>
      
      {moderatedCohort && (
        <Alert>
          <Group className="h-4 w-4" />
          <AlertTitle>Moderating Cohort: {moderatedCohort.name}</AlertTitle>
          <AlertDescription>
            Your dashboard view is filtered to only show teams and data relevant to your assigned cohort.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="requests" className="w-full">
        <TabsList className={`grid w-full ${moderatedCohort ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="requests">Pending Requests</TabsTrigger>
          <TabsTrigger value="teams">Team Balances</TabsTrigger>
          {moderatedCohort && <TabsTrigger value="cohort-leaderboard">Cohort Leaderboard</TabsTrigger>}
          <TabsTrigger value="log">Transaction Log</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
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
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaymentRequests?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No pending requests.</TableCell></TableRow>}
                  {filteredPaymentRequests?.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <span className="font-medium">{req.fromTeamName}</span>
                           <ArrowRight className="h-4 w-4 text-muted-foreground" /> 
                           <span className="font-medium">{req.toTeamName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{req.reason}</div>
                      </TableCell>
                      <TableCell>₹{req.amount.toLocaleString()}</TableCell>
                      <TableCell>{formatDistanceToNow(new Date(req.timestamp), { addSuffix: true })}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleApprove(req)}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleReject(req)}><X className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Team Balances</CardTitle>
              <CardDescription>Overview of all team financial statuses{moderatedCohort && " in your cohort"}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Credit Score</TableHead>
                    <TableHead>Loan Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamsForDisplay?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No teams found.</TableCell></TableRow>}
                  {teamsForDisplay?.map((team) => {
                    return (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>₹{team.balance.toLocaleString()}</TableCell>
                        <TableCell>{team.creditScore}</TableCell>
                        <TableCell>
                          {team.hasActiveLoan ? (
                            <Badge variant="destructive">ACTIVE</Badge>
                          ) : (
                            <Badge variant="secondary">None</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        {moderatedCohort && (
           <TabsContent value="cohort-leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy/> Cohort Leaderboard</CardTitle>
                <CardDescription>Current rankings for teams within the <span className='font-semibold'>{moderatedCohort.name}</span> cohort.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Team</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isCohortLeaderboardLoading && <TableRow><TableCell colSpan={3} className="text-center"><Skeleton className="h-6 w-1/2 mx-auto" /></TableCell></TableRow>}
                    {!isCohortLeaderboardLoading && (!cohortLeaderboard || cohortLeaderboard.rankings.length === 0) && <TableRow><TableCell colSpan={3} className="text-center">No ranking data available for this cohort.</TableCell></TableRow>}
                    {cohortLeaderboard?.rankings.map((entry) => (
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
           </TabsContent>
        )}
         <TabsContent value="log">
          <Card>
            <CardHeader>
               <div>
                  <CardTitle>Your Recent Transactions</CardTitle>
                  <CardDescription>A log of all transactions you have personally performed{moderatedCohort && " for your cohort"}.</CardDescription>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No transactions found for the selected filters.</TableCell></TableRow>}
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{tx.type.replace(/_/g, ' ').toLowerCase()}</Badge>
                      </TableCell>
                      <TableCell>
                         <div className="font-medium">{tx.reason}</div>
                         <div className="text-sm text-muted-foreground">
                          {tx.fromTeamName ?? 'Bank'} → {tx.toTeamName ?? 'Bank'}
                         </div>
                      </TableCell>
                      <TableCell>{format(new Date(tx.timestamp), 'PPpp')}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{tx.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


function DashboardSkeleton({ isModerator }: { isModerator?: boolean }) {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className={`grid w-full ${isModerator ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          {isModerator && <Skeleton className="h-10 w-full" />}
        </TabsList>
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-1/4" />
              <Skeleton className="h-4 w-2/5" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
