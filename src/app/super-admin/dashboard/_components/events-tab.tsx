'use client';

import { format } from 'date-fns';
import { CalendarPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CreateEventDialog } from '@/components/dashboard/create-event-dialog';
import type { Event } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface EventsTabProps {
  events: Event[];
}

export function EventsTab({ events }: EventsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>All Events</CardTitle>
          <CardDescription>Manage all events in the system.</CardDescription>
        </div>
        <CreateEventDialog>
          <Button>
            <CalendarPlus className="mr-2 h-4 w-4" /> Create Event
          </Button>
        </CreateEventDialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Initial Balance</TableHead>
              <TableHead>Loan Limit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.name}</TableCell>
                <TableCell>{format(new Date(event.startDate), 'PPP')}</TableCell>
                <TableCell>{format(new Date(event.endDate), 'PPP')}</TableCell>
                <TableCell>{formatCurrency(event.initialTeamBalance)}</TableCell>
                <TableCell>{formatCurrency(event.loanLimit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
