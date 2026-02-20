'use client';

import { useState } from 'react';
import { doc, deleteDoc, Firestore } from 'firebase/firestore';
import { MoreHorizontal, Search, Wallet, Shield, Trash2, ShieldAlert, BadgeCheck, Pencil, UserMinus, UserRoundPlus, TrendingUp } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateDocumentNonBlocking } from '@/firebase';
import { AdjustBalanceDialog } from '@/components/dashboard/adjust-balance-dialog';
import { CreditScoreOverrideDialog } from '@/components/dashboard/credit-score-override-dialog';
import { CreateTeamDialog } from '@/components/dashboard/create-team-dialog';
import { ForceCloseLoanDialog } from '@/components/dashboard/force-close-loan-dialog';
import { BulkCreateTeamsDialog } from '@/components/dashboard/bulk-create-teams-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Team, Event, Loan, Cohort } from '@/lib/types';

interface TeamsTabProps {
  firestore: Firestore;
  userId: string;
  teams: Team[];
  events: Event[];
  loans: Loan[];
  cohorts: Cohort[];
}

export function TeamsTab({ firestore, userId, teams, events, loans, cohorts }: TeamsTabProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

  const handleDeleteTeam = async (teamId: string, eventId: string) => {
    try {
      await deleteDoc(doc(firestore, 'events', eventId, 'teams', teamId));
      toast({
        title: "Team Deleted",
        description: "The team has been successfully deleted.",
      });
      setDeletingTeam(null);
    } catch (error: any) {
      console.error("Failed to delete team:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Team",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  const handleToggleTeamStatus = (team: Team) => {
    const teamRef = doc(firestore, 'events', team.eventId, 'teams', team.id);
    const newStatus = team.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    updateDocumentNonBlocking(teamRef, { status: newStatus });
    toast({ title: 'Team Status Updated', description: `${team.name} has been ${newStatus.toLowerCase()}.` });
  };

  const handleEditTeamName = async (team: Team, newName: string) => {
    if (!newName.trim() || newName === team.name) return;
    const teamRef = doc(firestore, 'events', team.eventId, 'teams', team.id);
    
    // Check if another team has this name
    const nameExists = teams.some(t => t.name.toLowerCase() === newName.trim().toLowerCase() && t.id !== team.id);
    if (nameExists) {
        toast({ title: 'Error', description: 'A team with this name already exists.', variant: 'destructive' });
        return;
    }
    
    updateDocumentNonBlocking(teamRef, { name: newName.trim() });
    toast({ title: 'Team Renamed', description: `Team successfully renamed to ${newName.trim()}.` });
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
                <TableHead>Cohort</TableHead>
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
                      <TableCell colSpan={8} className="h-24 text-center">
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
                        <TableCell>
                            <span className="text-sm font-medium">
                                {cohorts.find((c) => c.id === team.cohortId)?.name ?? <span className="text-muted-foreground">Unassigned</span>}
                            </span>
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
                            {team.status?.toLowerCase() || 'unknown'}
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
                              
                              <RenameTeamDialog team={team} onRename={(newName) => handleEditTeamName(team, newName)}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Pencil className="mr-2 h-4 w-4" /> Rename Team
                                </DropdownMenuItem>
                              </RenameTeamDialog>

                              <AdjustBalanceDialog team={team} adminId={userId}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Wallet className="mr-2 h-4 w-4" /> Adjust Balance
                                </DropdownMenuItem>
                              </AdjustBalanceDialog>

                              <CreditScoreOverrideDialog team={team}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Shield className="mr-2 h-4 w-4" /> Override Score
                                </DropdownMenuItem>
                              </CreditScoreOverrideDialog>

                              <DropdownMenuItem 
                                onSelect={(e) => { e.preventDefault(); setDeletingTeam(team); }} 
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    onSelect={(e) => e.preventDefault()} 
                                    className={team.status === 'ACTIVE' ? "text-destructive focus:text-destructive" : "text-green-600 focus:text-green-600"}
                                  >
                                    {team.status === 'ACTIVE' ? (
                                      <><UserMinus className="mr-2 h-4 w-4" /> Deactivate Team</>
                                    ) : (
                                      <><UserRoundPlus className="mr-2 h-4 w-4" /> Activate Team</>
                                    )}
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {team.status === 'ACTIVE' ? 'Deactivate Team?' : 'Activate Team?'}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {team.status === 'ACTIVE' 
                                        ? `Are you sure you want to deactivate ${team.name}? They will not be able to log in or participate.`
                                        : `Are you sure you want to activate ${team.name}? They will be able to log in and participate normally.`
                                      }
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleToggleTeamStatus(team)}>
                                      Confirm
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              {loan && (
                                <ForceCloseLoanDialog team={team} loan={loan} adminId={userId}>
                                  <DropdownMenuItem 
                                    onSelect={(e) => e.preventDefault()} 
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Wallet className="mr-2 h-4 w-4" /> Force Close Loan
                                  </DropdownMenuItem>
                                </ForceCloseLoanDialog>
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

      <AlertDialog open={!!deletingTeam} onOpenChange={(open) => !open && setDeletingTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the team <strong>{deletingTeam?.name}</strong>? 
              This action cannot be undone and will remove all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingTeam && handleDeleteTeam(deletingTeam.id, deletingTeam.eventId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deletingTeam} onOpenChange={(open) => !open && setDeletingTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the team <strong className="font-semibold text-foreground">{deletingTeam?.name}</strong>? 
              This action cannot be undone and will permanently remove all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingTeam && handleDeleteTeam(deletingTeam.id, deletingTeam.eventId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function RenameTeamDialog({ team, onRename, children }: { team: Team, onRename: (newName: string) => void, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(team.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRename(newName);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Team</DialogTitle>
          <DialogDescription>
            Change the name of {team.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new team name"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
