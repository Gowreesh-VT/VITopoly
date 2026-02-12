'use client';

import { doc, Firestore } from 'firebase/firestore';
import { UserRoundPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { updateDocumentNonBlocking } from '@/firebase';
import { AdjustBalanceDialog } from '@/components/dashboard/adjust-balance-dialog';
import { CreditScoreOverrideDialog } from '@/components/dashboard/credit-score-override-dialog';
import { CreateTeamDialog } from '@/components/dashboard/create-team-dialog';
import { CreateTeamUserDialog } from '@/components/dashboard/create-team-user-dialog';
import { ForceCloseLoanDialog } from '@/components/dashboard/force-close-loan-dialog';
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

  const handleToggleTeamStatus = (team: Team) => {
    const teamRef = doc(firestore, 'events', team.eventId, 'teams', team.id);
    const newStatus = team.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    updateDocumentNonBlocking(teamRef, { status: newStatus });
    toast({ title: 'Team Status Updated', description: `${team.name} has been ${newStatus.toLowerCase()}.` });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>All Teams</CardTitle>
          <CardDescription>Manage all teams across all events.</CardDescription>
        </div>
        <CreateTeamDialog events={events}>
          <Button>
            <UserRoundPlus className="mr-2 h-4 w-4" /> Create Team
          </Button>
        </CreateTeamDialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Credit Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Loan Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => {
              const loan = loans.find((l) => l.teamId === team.id && l.status === 'ACTIVE');
              return (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{events.find((e) => e.id === team.eventId)?.name ?? 'N/A'}</TableCell>
                  <TableCell>₹{team.balance.toLocaleString()}</TableCell>
                  <TableCell>{team.creditScore}</TableCell>
                  <TableCell>
                    <Badge variant={team.status === 'ACTIVE' ? 'default' : 'destructive'}>{team.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {loan ? (
                      <Badge variant="destructive">{`₹${loan.amount.toLocaleString()}`}</Badge>
                    ) : (
                      <Badge variant="secondary">None</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <AdjustBalanceDialog team={team} adminId={userId}>
                      <Button variant="ghost" size="sm">Adjust Balance</Button>
                    </AdjustBalanceDialog>
                    <CreditScoreOverrideDialog team={team}>
                      <Button variant="outline" size="sm">Override Score</Button>
                    </CreditScoreOverrideDialog>
                    <CreateTeamUserDialog team={team}>
                      <Button variant="outline" size="sm">Create Login</Button>
                    </CreateTeamUserDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-24">
                          {team.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </Button>
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
                    {loan && (
                      <ForceCloseLoanDialog team={team} loan={loan} adminId={userId}>
                        <Button variant="destructive" size="sm">Force Close Loan</Button>
                      </ForceCloseLoanDialog>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
