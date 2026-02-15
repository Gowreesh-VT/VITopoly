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

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface PropertiesTabProps {
  properties: Property[];
  events: Event[];
  cohorts: Cohort[];
  teams: Team[];
}

export function PropertiesTab({ properties, events, cohorts, teams }: PropertiesTabProps) {
  // 1. Split properties into Seized vs Active
  const seizedProperties = properties.filter(p => p.status === 'SEIZED');
  const activeProperties = properties.filter(p => p.status !== 'SEIZED');

  // 2. Group ACTIVE properties by cohortId
  const propertiesByCohort = activeProperties.reduce<Record<string, Property[]>>((acc, prop) => {
    const cohortId = prop.cohortId || 'unassigned';
    if (!acc[cohortId]) {
      acc[cohortId] = [];
    }
    acc[cohortId].push(prop);
    return acc;
  }, {});

  // Sort cohorts by name for display, handling unassigned last
  const sortedCohortIds = Object.keys(propertiesByCohort).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    const cohortA = cohorts.find(c => c.id === a);
    const cohortB = cohorts.find(c => c.id === b);
    return (cohortA?.name || '').localeCompare(cohortB?.name || '');
  });

  return (
    <div className="space-y-6">
      {/* SECTION 1: SEIZED / AUCTION POOL */}
      {seizedProperties.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Auction Pool (Seized Assets)</CardTitle>
            <CardDescription>
              These properties have been seized from bankrupt teams and are available for offline auction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Original Cohort</TableHead>
                    <TableHead>Base Value</TableHead>
                    <TableHead>Previous Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seizedProperties.map((prop) => (
                    <TableRow key={prop.id}>
                      <TableCell className="font-medium">{prop.name}</TableCell>
                      <TableCell>{cohorts.find((c) => c.id === prop.cohortId)?.name}</TableCell>
                      <TableCell>{formatCurrency(prop.baseValue)}</TableCell>
                      <TableCell className="text-muted-foreground">{prop.previousOwnerName || '-'}</TableCell>
                       <TableCell>
                        <Badge variant="destructive">SEIZED</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AssignPropertyOwnerDialog property={prop} teams={teams}>
                          <Button size="sm" variant="outline">Re-Assign / Auction</Button>
                        </AssignPropertyOwnerDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: ACTIVE PROPERTIES BY COHORT */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Properties</CardTitle>
            <CardDescription>Manage owned and unowned properties grouped by cohort.</CardDescription>
          </div>
          <CreatePropertyDialog cohorts={cohorts}>
            <Button>
              <Home className="mr-2 h-4 w-4" /> Create Property
            </Button>
          </CreatePropertyDialog>
        </CardHeader>
        <CardContent>
          {activeProperties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active properties defined.</div>
          ) : (
              <Accordion type="multiple" defaultValue={sortedCohortIds} className="w-full space-y-4">
              {sortedCohortIds.map((cohortId) => {
                  const cohort = cohorts.find(c => c.id === cohortId);
                  const cohortName = cohort ? cohort.name : (cohortId === 'unassigned' ? 'Unassigned' : 'Unknown Cohort');
                  const cohortProps = propertiesByCohort[cohortId];

                  return (
                  <AccordionItem key={cohortId} value={cohortId} className="border rounded-lg px-4 bg-card">
                      <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-4">
                              <span className="font-bold text-lg">{cohortName}</span>
                              <Badge variant="secondary">{cohortProps.length} Properties</Badge>
                              {cohort?.moderatorId && <Badge variant="outline" className="text-xs font-normal">Mod: {cohort.moderatorId}</Badge>}
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4">
                          <div className="overflow-x-auto">
                              <Table>
                                  <TableHeader>
                                  <TableRow>
                                      <TableHead>Property</TableHead>
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
                                  {cohortProps.map((prop) => (
                                      <TableRow key={prop.id}>
                                      <TableCell className="font-medium">{prop.name}</TableCell>
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
                                          <Button size="sm" variant="ghost">Manage</Button>
                                          </AssignPropertyOwnerDialog>
                                      </TableCell>
                                      </TableRow>
                                  ))}
                                  </TableBody>
                              </Table>
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                  );
              })}
              </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
