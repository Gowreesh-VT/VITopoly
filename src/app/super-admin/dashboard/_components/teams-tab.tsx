'use client';

import { useState } from 'react';
import { doc, Firestore } from 'firebase/firestore';
import { UserRoundPlus, MoreHorizontal, Search, ShieldAlert, BadgeCheck, Shield, Wallet, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateDocumentNonBlocking } from '@/firebase';
import { AdjustBalanceDialog } from '@/components/dashboard/adjust-balance-dialog';
import { CreditScoreOverrideDialog } from '@/components/dashboard/credit-score-override-dialog';
import { CreateTeamDialog } from '@/components/dashboard/create-team-dialog';
import { ForceCloseLoanDialog } from '@/components/dashboard/force-close-loan-dialog';
import { BulkCreateTeamsDialog } from '@/components/dashboard/bulk-create-teams-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Team, Event, Loan } from '@/lib/types';

interface TeamsTabProps {
  firestore: Firestore;
  userId: string;
  teams: Team[];
  events: Event[];
  loans: Loan[];
}

export function TeamsTab({ firestore, userId, teams, events, loans }: TeamsTabProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleTeamStatus = (team: Team) => {
    const teamRef = doc(firestore, 'events', team.eventId, 'teams', team.id);
    const newStatus = team.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    updateDocumentNonBlocking(teamRef, { status: newStatus });
    toast({ title: 'Team Status Updated', description: `${team.name} has been ${newStatus.toLowerCase()}.` });
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pb-4 flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">Teams</CardTitle>
          <CardDescription>Manage and monitor all participating teams.</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
            <BulkCreateTeamsDialog events={events} />
            <CreateTeamDialog events={events}>
              <Button>
                <UserRoundPlus className="mr-2 h-4 w-4" /> Create Team
              </Button>
            </CreateTeamDialog>
        </div>
      </CardHeader>
      
      <div className="flex items-center py-4 px-1 sticky top-0 bg-background z-10 gap-2">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search teams..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <CardContent className="p-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Team Name</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Credit Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active Loan</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                          No teams found.
                      </TableCell>
                  </TableRow>
              ) : (
                  filteredTeams.map((team) => {
                    const loan = loans.find((l) => l.teamId === team.id && l.status === 'ACTIVE');
                    return (
                      <TableRow key={team.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${team.name}`} alt={team.name} />
                                    <AvatarFallback>{getInitials(team.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="font-medium">{team.name}</span>
                                    {team.isEliminated && <span className="text-xs text-destructive font-semibold">ELIMINATED</span>}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className="font-normal">
                                {events.find((e) => e.id === team.eventId)?.name ?? 'N/A'}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-mono">₹{team.balance.toLocaleString()}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className={`w-3.5 h-3.5 ${team.creditScore >= 700 ? 'text-green-500' : team.creditScore >= 500 ? 'text-yellow-500' : 'text-red-500'}`} />
                                {team.creditScore}
                            </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={team.status === 'ACTIVE' ? 'default' : 'destructive'} className="capitalize">
                            {team.status === 'ACTIVE' ? <BadgeCheck className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                            {team.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {loan ? (
                            <Badge variant="destructive" className="font-mono">
                                ₹{loan.amount.toLocaleString()}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                  <div onClick={(e) => e.preventDefault()}>
                                    <AdjustBalanceDialog team={team} adminId={userId}>
                                      <div className="flex items-center w-full cursor-pointer">
                                        <Wallet className="mr-2 h-4 w-4" /> Adjust Balance
                                      </div>
                                    </AdjustBalanceDialog>
                                  </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                  <div onClick={(e) => e.preventDefault()}>
                                    <CreditScoreOverrideDialog team={team}>
                                        <div className="flex items-center w-full cursor-pointer">
                                            <Shield className="mr-2 h-4 w-4" /> Override Score
                                        </div>
                                    </CreditScoreOverrideDialog>
                                  </div>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <div onClick={(e) => e.preventDefault()} className={team.status === 'ACTIVE' ? "text-destructive focus:text-destructive" : "text-green-600 focus:text-green-600"}>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <div className="flex items-center w-full cursor-pointer">
                                            {team.status === 'ACTIVE' ? <ShieldAlert className="mr-2 h-4 w-4" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
                                            {team.status === 'ACTIVE' ? 'Suspend Team' : 'Activate Team'}
                                        </div>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will {team.status === 'ACTIVE' ? 'suspend' : 'activate'} the team{' '}
                                            <span className="font-semibold">{team.name}</span>. Suspended teams cannot participate in
                                            transactions.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleToggleTeamStatus(team)}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                              </DropdownMenuItem>
                              {loan && (
                                <DropdownMenuItem asChild>
                                    <div onClick={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                        <ForceCloseLoanDialog team={team} loan={loan} adminId={userId}>
                                            <div className="flex items-center w-full cursor-pointer">
                                                <Wallet className="mr-2 h-4 w-4" /> Force Close Loan
                                            </div>
                                        </ForceCloseLoanDialog>
                                    </div>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
