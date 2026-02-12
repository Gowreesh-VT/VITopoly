'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/stat-card';
import { format } from 'date-fns';
import { DollarSign, Users, Shield, Download, CalendarPlus, UserPlus, Landmark, TrendingUp, HandCoins, UserRoundPlus, ArrowRightLeft, Gamepad2, Settings, Group, Home, Trophy, UserCog } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, useUser, updateDocumentNonBlocking, useGameConfig } from '@/firebase';
import { collection, collectionGroup, query, orderBy, doc, setDoc } from 'firebase/firestore';
import type { Team, Transaction, Admin, Loan, Event, UserProfile, GameConfig, Cohort, Property, Leaderboard } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect } from 'react';
import { CreditScoreOverrideDialog } from '@/components/dashboard/credit-score-override-dialog';
import { useToast } from '@/hooks/use-toast';
import { CreateEventDialog } from '@/components/dashboard/create-event-dialog';
import { AddAdminDialog } from '@/components/dashboard/add-admin-dialog';
import { AdjustBalanceDialog } from '@/components/dashboard/adjust-balance-dialog';
import { CreateTeamDialog } from '@/components/dashboard/create-team-dialog';
import { ForceCloseLoanDialog } from '@/components/dashboard/force-close-loan-dialog';
import { UpdateGameStateDialog } from '@/components/dashboard/update-game-state-dialog';
import { CreateCohortDialog } from '@/components/dashboard/create-cohort-dialog';
import { ManageCohortTeamsDialog } from '@/components/dashboard/manage-cohort-teams-dialog';
import { CreatePropertyDialog } from '@/components/dashboard/create-property-dialog';
import { AssignPropertyOwnerDialog } from '@/components/dashboard/assign-property-owner-dialog';

export default function SuperAdminDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isClient, setIsClient] = useState(false);

  const { gameConfig, isGameConfigLoading } = useGameConfig();

  useEffect(() => {
    setIsClient(true);
    const validTabs = ['overview', 'events', 'teams', 'admins', 'cohorts', 'properties', 'leaderboard', 'ledger'];

    const syncHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const { data: events, isLoading: areEventsLoading } = useCollection<Event>(
    useMemoFirebase(() => query(collection(firestore, 'events'), orderBy('startDate', 'desc')), [firestore])
  );

  const { data: teams, isLoading: areTeamsLoading } = useCollection<Team>(
    useMemoFirebase(() => query(collectionGroup(firestore, 'teams'), orderBy('name')), [firestore])
  );
  
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => collection(firestore, 'users'), [firestore])
  );

  const { data: admins, isLoading: areAdminsLoading } = useCollection<Admin>(
    useMemoFirebase(() => collectionGroup(firestore, 'admins'), [firestore])
  );
  
  const { data: ledger, isLoading: isLedgerLoading } = useCollection<Transaction>(
    useMemoFirebase(() => query(collectionGroup(firestore, 'transactions'), orderBy('timestamp', 'desc')), [firestore])
  );
  
  const { data: loans, isLoading: areLoansLoading } = useCollection<Loan>(
    useMemoFirebase(() => collectionGroup(firestore, 'loans'), [firestore])
  );

  const { data: cohorts, isLoading: areCohortsLoading } = useCollection<Cohort>(
    useMemoFirebase(() => query(collection(firestore, 'cohorts'), orderBy('name')), [firestore])
  );
  
  const { data: properties, isLoading: arePropertiesLoading } = useCollection<Property>(
    useMemoFirebase(() => query(collection(firestore, 'properties'), orderBy('name')), [firestore])
  );

  const { data: leaderboards, isLoading: areLeaderboardsLoading } = useCollection<Leaderboard>(
    useMemoFirebase(() => collection(firestore, 'leaderboards'), [firestore])
  );

  const handleExport = () => {
    if (!ledger) {
      toast({ variant: "destructive", title: "Export Failed", description: "No ledger data available to export." });
      return;
    }

    const header = ['id', 'eventId', 'timestamp', 'type', 'fromTeamId', 'fromTeamName', 'toTeamId', 'toTeamName', 'adminId', 'amount', 'reason', 'balanceAfterTransaction'];
    const csvRows = [
      header.join(','),
      ...ledger.map(tx => [tx.id, tx.eventId, tx.timestamp, tx.type, tx.fromTeamId ?? '', `"${tx.fromTeamName?.replace(/"/g, '""') ?? ''}"`, tx.toTeamId ?? '', `"${tx.toTeamName?.replace(/"/g, '""') ?? ''}"`, tx.adminId ?? '', tx.amount, `"${tx.reason.replace(/"/g, '""')}"`, tx.balanceAfterTransaction ?? ''].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `vcash-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveAdmin = (admin: Admin) => {
    const adminRef = doc(firestore, 'events', admin.eventId, 'admins', admin.id);
    deleteDocumentNonBlocking(adminRef);
    const userRef = doc(firestore, 'users', admin.id);
    updateDocumentNonBlocking(userRef, { role: 'TEAM', eventId: '' });
    toast({ title: "Admin Removed", description: `${admin.name ?? admin.email} has been demoted to a TEAM role.` });
  };

  const handleToggleTeamStatus = (team: Team) => {
    const teamRef = doc(firestore, 'events', team.eventId, 'teams', team.id);
    const newStatus = team.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    updateDocumentNonBlocking(teamRef, { status: newStatus });
    toast({ title: 'Team Status Updated', description: `${team.name} has been ${newStatus.toLowerCase()}.` });
  };

  const handleInitializeGameState = async () => {
    const gameStateRef = doc(firestore, 'game_config', 'current_event');
    const defaultGameState: GameConfig = {
      id: 'current_event', currentRound: 1, roundStatus: 'REGISTRATION', roundStartTime: new Date().toISOString(),
      roundEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      cashWeight: 0.4, propertyWeight: 0.3, tokenWeight: 0.2, creditWeight: 0.1,
    };
    await setDoc(gameStateRef, defaultGameState);
    toast({ title: "Game State Initialized", description: "The global game state has been set to its default values." });
  };


  const isLoading = areTeamsLoading || areAdminsLoading || isLedgerLoading || areLoansLoading || areEventsLoading || areUsersLoading || isGameConfigLoading || areCohortsLoading || arePropertiesLoading || areLeaderboardsLoading;
  const totalVCash = React.useMemo(() => teams?.reduce((sum, team) => sum + team.balance, 0) ?? 0, [teams]);
  const totalActiveLoans = React.useMemo(() => loans?.filter(l => l.status === 'ACTIVE').reduce((sum, loan) => sum + loan.amount, 0) ?? 0, [loans]);
  const averageCreditScore = React.useMemo(() => (!teams || teams.length === 0) ? 0 : Math.round(teams.reduce((sum, team) => sum + team.creditScore, 0) / teams.length), [teams]);

  if (isLoading || !isClient) return <DashboardSkeleton />;
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">System Dashboard</h1>
        <Button onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export Ledger (CSV)</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-6">
                <StatCard title="V-Cash in Circulation" value={`₹${totalVCash.toLocaleString()}`} icon={<DollarSign />} />
                <StatCard title="Total Active Loans" value={`₹${totalActiveLoans.toLocaleString()}`} icon={<Landmark />} />
                <StatCard title="Avg. Credit Score" value={averageCreditScore} icon={<TrendingUp />} />
                <StatCard title="Total Teams" value={teams?.length ?? 0} icon={<Users />} />
                <StatCard title="Total Admins" value={admins?.length ?? 0} icon={<Shield />} />
                <StatCard title="Total Transactions" value={ledger?.length.toLocaleString() ?? 0} icon={<ArrowRightLeft />} />
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Gamepad2 /> Global Game State</CardTitle>
                    <CardDescription>Control the current state of the entire event.</CardDescription>
                  </div>
                  {gameConfig ? (
                    <UpdateGameStateDialog gameConfig={gameConfig}><Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Update State</Button></UpdateGameStateDialog>
                  ) : (
                    <Button onClick={handleInitializeGameState}><Settings className="mr-2 h-4 w-4" /> Initialize Game State</Button>
                  )}
                </CardHeader>
                <CardContent>
                  {gameConfig ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><div className="text-muted-foreground">Current Round</div><div className="font-semibold">{gameConfig.currentRound}</div></div>
                      <div><div className="text-muted-foreground">Round Status</div><div className="font-semibold">{gameConfig.roundStatus.replace(/_/g, ' ')}</div></div>
                      <div><div className="text-muted-foreground">Round Start</div><div className="font-semibold">{format(new Date(gameConfig.roundStartTime), 'Pp')}</div></div>
                      <div><div className="text-muted-foreground">Round End</div><div className="font-semibold">{format(new Date(gameConfig.roundEndTime), 'Pp')}</div></div>
                      <div><div className="text-muted-foreground">Cash Weight</div><div className="font-semibold">{gameConfig.cashWeight}</div></div>
                      <div><div className="text-muted-foreground">Property Weight</div><div className="font-semibold">{gameConfig.propertyWeight}</div></div>
                      <div><div className="text-muted-foreground">Token Weight</div><div className="font-semibold">{gameConfig.tokenWeight}</div></div>
                      <div><div className="text-muted-foreground">Credit Weight</div><div className="font-semibold">{gameConfig.creditWeight}</div></div>
                    </div>
                  ) : ( <p>The game state has not been initialized. Click the button above to create the default game state.</p> )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="events">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle>All Events</CardTitle><CardDescription>Manage all events in the system.</CardDescription></div>
                    <CreateEventDialog><Button><CalendarPlus className="mr-2 h-4 w-4" /> Create Event</Button></CreateEventDialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Start Date</TableHead><TableHead>End Date</TableHead><TableHead>Initial Balance</TableHead><TableHead>Loan Limit</TableHead></TableRow></TableHeader>
                        <TableBody>{events?.map((event) => (<TableRow key={event.id}><TableCell className="font-medium">{event.name}</TableCell><TableCell>{format(new Date(event.startDate), 'PPP')}</TableCell><TableCell>{format(new Date(event.endDate), 'PPP')}</TableCell><TableCell>₹{event.initialTeamBalance.toLocaleString()}</TableCell><TableCell>₹{event.loanLimit.toLocaleString()}</TableCell></TableRow>))}</TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>All Teams</CardTitle><CardDescription>Manage all teams across all events.</CardDescription></div>
                 <CreateTeamDialog events={events ?? []}><Button><UserRoundPlus className="mr-2 h-4 w-4" /> Create Team</Button></CreateTeamDialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Team</TableHead><TableHead>Event</TableHead><TableHead>Balance</TableHead><TableHead>Credit Score</TableHead><TableHead>Status</TableHead><TableHead>Loan Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {teams?.map((team) => {
                    const loan = loans?.find(l => l.teamId === team.id && l.status === 'ACTIVE');
                    return (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{events?.find(e => e.id === team.eventId)?.name ?? 'N/A'}</TableCell>
                        <TableCell>₹{team.balance.toLocaleString()}</TableCell>
                        <TableCell>{team.creditScore}</TableCell>
                        <TableCell><Badge variant={team.status === 'ACTIVE' ? 'default' : 'destructive'}>{team.status}</Badge></TableCell>
                        <TableCell>{loan ? <Badge variant="destructive">{`₹${loan.amount.toLocaleString()}`}</Badge> : <Badge variant="secondary">None</Badge>}</TableCell>
                        <TableCell className="text-right space-x-2">
                           <AdjustBalanceDialog team={team} adminId={user!.uid}><Button variant="ghost" size="sm">Adjust Balance</Button></AdjustBalanceDialog>
                           <CreditScoreOverrideDialog team={team}><Button variant="outline" size="sm">Override Score</Button></CreditScoreOverrideDialog>
                           <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm" className="w-24">{team.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will {team.status === 'ACTIVE' ? 'suspend' : 'activate'} the team <span className="font-semibold">{team.name}</span>. Suspended teams cannot participate in transactions.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleToggleTeamStatus(team)}>Confirm</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                           {loan && (<ForceCloseLoanDialog team={team} loan={loan} adminId={user!.uid}><Button variant="destructive" size="sm">Force Close Loan</Button></ForceCloseLoanDialog>)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>All Admins</CardTitle><CardDescription>Manage system and event administrators.</CardDescription></div>
              <AddAdminDialog events={events ?? []} users={users ?? []}><Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Add Admin</Button></AddAdminDialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Event</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {users?.filter(u => u.role === 'SUPER_ADMIN').map(admin => (
                     <TableRow key={admin.id} className="bg-muted/50"><TableCell className="font-medium">{admin.displayName ?? admin.email}</TableCell><TableCell>{admin.email}</TableCell><TableCell><Badge>SUPER ADMIN</Badge></TableCell><TableCell>All Events</TableCell><TableCell className="text-right"></TableCell></TableRow>
                  ))}
                  {admins?.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name ?? admin.email}</TableCell><TableCell>{admin.email}</TableCell>
                      <TableCell><Badge variant="secondary">ADMIN</Badge></TableCell><TableCell>{events?.find(e => e.id === admin.eventId)?.name ?? admin.eventId}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="sm">Remove</Button></AlertDialogTrigger>
                          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the admin <span className="font-semibold">{admin.name ?? admin.email}</span>. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveAdmin(admin)}>Remove Admin</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>All Cohorts</CardTitle><CardDescription>Manage cohorts across all events.</CardDescription></div>
              <CreateCohortDialog events={events ?? []} admins={admins ?? []}><Button><Group className="mr-2 h-4 w-4" /> Create Cohort</Button></CreateCohortDialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Cohort Name</TableHead><TableHead>Event</TableHead><TableHead>Moderator</TableHead><TableHead>Team Count</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cohorts?.map((cohort) => (
                    <TableRow key={cohort.id}>
                      <TableCell className="font-medium">{cohort.name}</TableCell>
                      <TableCell>{events?.find(e => e.id === cohort.eventId)?.name}</TableCell>
                      <TableCell>{admins?.find(a => a.id === cohort.moderatorId)?.name ?? users.find(u => u.id === cohort.moderatorId)?.displayName}</TableCell>
                      <TableCell>{cohort.teamIds.length}</TableCell>
                      <TableCell><Badge variant={cohort.status === 'ACTIVE' ? 'default' : 'secondary'}>{cohort.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <ManageCohortTeamsDialog cohort={cohort} allTeams={teams ?? []}><Button size="sm"><UserCog className="mr-2 h-4 w-4" />Manage Teams</Button></ManageCohortTeamsDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>All Properties</CardTitle><CardDescription>Manage properties across all events.</CardDescription></div>
              <CreatePropertyDialog cohorts={cohorts ?? []}><Button><Home className="mr-2 h-4 w-4" />Create Property</Button></CreatePropertyDialog>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>Event</TableHead><TableHead>Cohort</TableHead><TableHead>Value</TableHead><TableHead>Rent</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {properties?.map((prop) => (
                    <TableRow key={prop.id}>
                      <TableCell className="font-medium">{prop.name}</TableCell>
                      <TableCell>{events?.find(e => e.id === prop.eventId)?.name}</TableCell>
                      <TableCell>{cohorts?.find(c => c.id === prop.cohortId)?.name}</TableCell>
                      <TableCell>₹{prop.baseValue.toLocaleString()}</TableCell>
                      <TableCell>₹{prop.rentValue.toLocaleString()}</TableCell>
                      <TableCell>{prop.ownerTeamName ?? '-'}</TableCell>
                      <TableCell><Badge variant={prop.status === 'OWNED' ? 'default' : 'secondary'}>{prop.status}</Badge></TableCell>
                      <TableCell className="text-right"><AssignPropertyOwnerDialog property={prop} teams={teams ?? []}><Button size="sm">Manage</Button></AssignPropertyOwnerDialog></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="leaderboard">
            <Card>
                <CardHeader>
                    <CardTitle>Leaderboard</CardTitle>
                    <CardDescription>View current rankings. Data is populated by the Scoring Engine Cloud Function.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Team</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {leaderboards?.[0]?.overallRankings?.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">No ranking data available.</TableCell></TableRow>}
                            {leaderboards?.[0]?.overallRankings?.map((entry) => (
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

        <TabsContent value="ledger">
          <Card>
            <CardHeader><CardTitle>Full Transaction Ledger</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>TXN ID</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead><TableHead>Timestamp</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ledger?.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.id.substring(0, 8)}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{tx.type.replace(/_/g, ' ').toLowerCase()}</Badge></TableCell>
                      <TableCell><div className="font-medium">{tx.reason}</div><div className="text-sm text-muted-foreground">{tx.fromTeamName ?? 'SYS'} → {tx.toTeamName ?? 'SYS'}</div></TableCell>
                      <TableCell>{format(new Date(tx.timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                      <TableCell className="text-right font-medium">₹{tx.amount.toLocaleString()}</TableCell>
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

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
       <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
        </TabsList>
        <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-6">
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
            </div>
            <Card>
                <CardHeader><Skeleton className="h-7 w-1/4" /><Skeleton className="h-4 w-2/5" /></CardHeader>
                <CardContent><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div></CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
