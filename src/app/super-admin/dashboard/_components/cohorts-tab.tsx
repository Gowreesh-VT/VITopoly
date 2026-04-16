'use client';

import { Group, UserCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateCohortDialog } from '@/components/dashboard/create-cohort-dialog';
import { ManageCohortTeamsDialog } from '@/components/dashboard/manage-cohort-teams-dialog';
import type { Cohort, Event, Admin, Team, UserProfile } from '@/lib/types';

interface CohortsTabProps {
  cohorts: Cohort[];
  events: Event[];
  admins: Admin[];
  teams: Team[];
  users: UserProfile[];
}

export function CohortsTab({ cohorts, events, admins, teams, users }: CohortsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>All Cohorts</CardTitle>
          <CardDescription>Manage cohorts across all events.</CardDescription>
        </div>
        <CreateCohortDialog events={events} admins={admins}>
          <Button>
            <Group className="mr-2 h-4 w-4" /> Create Cohort
          </Button>
        </CreateCohortDialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cohort Name</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Moderator</TableHead>
              <TableHead>Team Count</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohorts.map((cohort) => (
              <TableRow key={cohort.id}>
                <TableCell className="font-medium">{cohort.name}</TableCell>
                <TableCell>{events.find((e) => e.id === cohort.eventId)?.name}</TableCell>
                <TableCell>
                  {admins.find((a) => a.id === cohort.moderatorId)?.name ??
                    users.find((u) => u.id === cohort.moderatorId)?.displayName}
                </TableCell>
                <TableCell>{cohort.teamIds.length}</TableCell>
                <TableCell>
                  <Badge variant={cohort.status === 'ACTIVE' ? 'default' : 'secondary'}>{cohort.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <ManageCohortTeamsDialog cohort={cohort} allTeams={teams}>
                    <Button size="sm">
                      <UserCog className="mr-2 h-4 w-4" />
                      Manage Teams
                    </Button>
                  </ManageCohortTeamsDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
