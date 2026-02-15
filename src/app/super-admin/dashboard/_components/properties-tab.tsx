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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>House Value</TableHead>
                <TableHead>Hotel Value</TableHead>
                <TableHead>Place Rent</TableHead>
                <TableHead>House Rent</TableHead>
                <TableHead>Hotel Rent</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Current State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((prop) => (
                <TableRow key={prop.id}>
                  <TableCell className="font-medium">{prop.name}</TableCell>
                  <TableCell>{cohorts.find((c) => c.id === prop.cohortId)?.name}</TableCell>
                  <TableCell>{formatCurrency(prop.baseValue)}</TableCell>
                  <TableCell>{formatCurrency(prop.houseValue ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(prop.hotelValue ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(prop.placeRent ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(prop.houseRent ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(prop.hotelRent ?? 0)}</TableCell>
                  <TableCell>{prop.ownerTeamName ?? '-'}</TableCell>
                  <TableCell>
                    {prop.upgradeLevel === 'HOUSE' && <Badge className="bg-blue-500">House</Badge>}
                    {prop.upgradeLevel === 'HOTEL' && <Badge className="bg-red-500">Hotel</Badge>}
                    {(!prop.upgradeLevel || prop.upgradeLevel === 'NONE') && <Badge variant="outline">Site Only</Badge>}
                  </TableCell>
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
        </div>
      </CardContent>
    </Card>
  );
}
