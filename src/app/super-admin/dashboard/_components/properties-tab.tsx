'use client';

import { Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreatePropertyDialog } from '@/components/dashboard/create-property-dialog';
import { AssignPropertyOwnerDialog } from '@/components/dashboard/assign-property-owner-dialog';
import type { Property, Event, Cohort, Team } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface PropertiesTabProps {
  properties: Property[];
  events: Event[];
  cohorts: Cohort[];
  teams: Team[];
}

export function PropertiesTab({ properties, events, cohorts, teams }: PropertiesTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>All Properties</CardTitle>
          <CardDescription>Manage properties across all events.</CardDescription>
        </div>
        <CreatePropertyDialog cohorts={cohorts}>
          <Button>
            <Home className="mr-2 h-4 w-4" /> Create Property
          </Button>
        </CreatePropertyDialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((prop) => (
              <TableRow key={prop.id}>
                <TableCell className="font-medium">{prop.name}</TableCell>
                <TableCell>{events.find((e) => e.id === prop.eventId)?.name}</TableCell>
                <TableCell>{cohorts.find((c) => c.id === prop.cohortId)?.name}</TableCell>
                <TableCell>{formatCurrency(prop.baseValue)}</TableCell>
                <TableCell>{formatCurrency(prop.rentValue)}</TableCell>
                <TableCell>{prop.ownerTeamName ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={prop.status === 'OWNED' ? 'default' : 'secondary'}>{prop.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AssignPropertyOwnerDialog property={prop} teams={teams}>
                    <Button size="sm">Manage</Button>
                  </AssignPropertyOwnerDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
