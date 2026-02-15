'use client';

import { useState, type ReactNode, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addTeamToCohort, removeTeamFromCohort, updateCohortModerator } from '@/firebase';
import type { Cohort, Team, Admin, UserProfile } from '@/lib/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PlusCircle, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type ManageCohortTeamsDialogProps = {
  children: ReactNode;
  cohort: Cohort;
  allTeams: Team[];
  admins: Admin[];
  users: UserProfile[];
};

export function ManageCohortTeamsDialog({ children, cohort, allTeams, admins, users }: ManageCohortTeamsDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const teamsInCohort = useMemo(() => allTeams.filter(t => cohort.teamIds.includes(t.id)), [allTeams, cohort]);
  const availableTeams = useMemo(() => allTeams.filter(t =>
    t.eventId === cohort.eventId &&
    !cohort.teamIds.includes(t.id) &&
    !t.cohortId // Only show unassigned teams
  ), [allTeams, cohort]);

  // Build a combined list of admins/users for the moderator dropdown
  const moderatorOptions = useMemo(() => {
    const options: { id: string; name: string }[] = [];
    admins.forEach(a => options.push({ id: a.id, name: a.name }));
    users.forEach(u => {
      // Only include users who are ADMIN or SUPER_ADMIN and not already in the list
      if ((u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') && !options.find(o => o.id === u.id)) {
        options.push({ id: u.id, name: u.displayName });
      }
    });
    return options;
  }, [admins, users]);

  const handleAddTeam = async (teamId: string) => {
    try {
      await addTeamToCohort(firestore, { cohortId: cohort.id, teamId, eventId: cohort.eventId });
      toast({ title: 'Team Added', description: 'The team has been added to the cohort.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleRemoveTeam = async (teamId: string) => {
    try {
      await removeTeamFromCohort(firestore, { cohortId: cohort.id, teamId, eventId: cohort.eventId });
      toast({ title: 'Team Removed', description: 'The team has been removed from the cohort.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleModeratorChange = async (newModeratorId: string) => {
    try {
      await updateCohortModerator(firestore, { cohortId: cohort.id, moderatorId: newModeratorId });
      const modName = moderatorOptions.find(o => o.id === newModeratorId)?.name ?? 'Unknown';
      toast({ title: 'Moderator Updated', description: `Moderator changed to ${modName}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>Manage {cohort.name}</DialogTitle>
          <DialogDescription>
            Change moderator, add or remove teams from this cohort.
          </DialogDescription>
        </DialogHeader>

        {/* Moderator Section */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <Label className="text-sm font-semibold whitespace-nowrap">Moderator:</Label>
          <Select defaultValue={cohort.moderatorId} onValueChange={handleModeratorChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a moderator" />
            </SelectTrigger>
            <SelectContent>
              {moderatorOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-6 -mx-6 px-6 border-y -my-6 py-6">
            <div className='flex flex-col gap-2'>
                <h3 className='font-semibold'>Teams in Cohort ({teamsInCohort.length})</h3>
                <ScrollArea className="h-72 rounded-md border">
                    <div className='p-2'>
                    {teamsInCohort.length === 0 && <p className='text-sm text-muted-foreground p-2'>No teams in this cohort.</p>}
                    {teamsInCohort.map(team => (
                        <div key={team.id} className='flex items-center justify-between p-2 rounded-md hover:bg-muted'>
                            <span>{team.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveTeam(team.id)}>
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            </div>
            <div className='flex flex-col gap-2'>
                 <h3 className='font-semibold'>Available Teams ({availableTeams.length})</h3>
                 <Command className='rounded-md border'>
                    <CommandInput placeholder="Search for a team to add..." />
                    <CommandList>
                        <CommandEmpty>No available teams found.</CommandEmpty>
                        <CommandGroup>
                        {availableTeams.map((team) => (
                            <CommandItem
                            key={team.id}
                            value={team.name}
                            onSelect={() => handleAddTeam(team.id)}
                            className='flex items-center justify-between'
                            >
                            {team.name}
                             <PlusCircle className="h-4 w-4" />
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
            <Button type="button">Close</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
