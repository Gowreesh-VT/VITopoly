'use client';

import { Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CreatePropertyDialog } from '@/components/dashboard/create-property-dialog';
import { AssignPropertyOwnerDialog } from '@/components/dashboard/assign-property-owner-dialog';
import type { Property, Event, Cohort, Team } from '@/lib/types';

interface PropertiesTabProps {
  properties: Property[];
  events: Event[];
  cohorts: Cohort[];
  teams: Team[];
}

export function PropertiesTab({ properties, events, cohorts, teams }: PropertiesTabProps) {
  const seizedProperties = properties.filter(p => p.status === 'SEIZED');
  const activeProperties = properties.filter(p => p.status !== 'SEIZED');

  // Group active properties by cohort
  const propertiesByCohort = cohorts.reduce((acc, cohort) => {
    acc[cohort.id] = activeProperties.filter(p => p.cohortId === cohort.id);
    return acc;
  }, {} as Record<string, Property[]>);

  // Catch any active properties without a valid cohort
  const unassignedProperties = activeProperties.filter(p => !cohorts.some(c => c.id === p.cohortId));

  return (
    <div className="space-y-6">
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
          {properties.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border rounded-lg">
              No properties found. Create one to get started.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Seized Assets Section */}
              {seizedProperties.length > 0 && (
                <Card className="border-destructive/20 bg-destructive/5 shadow-none">
                  <CardHeader className="py-4">
                    <div className="flex items-center gap-2">
                       <CardTitle className="text-lg text-destructive">Seized Assets</CardTitle>
                       <Badge variant="destructive">{seizedProperties.length}</Badge>
                    </div>
                    <CardDescription>Global view of all properties seized across all clusters.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 pb-2">
                    <div className="rounded-md border bg-background">
                      <CohortPropertyTable 
                        properties={seizedProperties} 
                        teams={teams} 
                        events={events} 
                        cohorts={cohorts} 
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Accordion type="multiple" className="w-full space-y-4">
                {cohorts.map((cohort) => {
                  const cohortProperties = propertiesByCohort[cohort.id] || [];
                  if (cohortProperties.length === 0) return null;

                  return (
                    <AccordionItem key={cohort.id} value={cohort.id} className="border rounded-lg px-4 bg-muted/20">
                      <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{cohort.name}</span>
                          <Badge variant="outline" className="ml-2 bg-background">
                            {cohortProperties.length} {cohortProperties.length === 1 ? 'Property' : 'Properties'}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-md border bg-background mt-2">
                           <CohortPropertyTable 
                              properties={cohortProperties} 
                              teams={teams} 
                              events={events} 
                              cohorts={cohorts} 
                           />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}

                {/* Unassigned Properties */}
                {unassignedProperties.length > 0 && (
                  <AccordionItem value="unassigned" className="border rounded-lg px-4 bg-muted/20">
                      <AccordionTrigger className="hover:no-underline text-destructive hover:text-destructive/80 transition-colors py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">Unassigned Properties</span>
                          <Badge variant="destructive" className="ml-2">
                            {unassignedProperties.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-md border bg-background mt-2">
                           <CohortPropertyTable 
                              properties={unassignedProperties} 
                              teams={teams} 
                              events={events} 
                              cohorts={cohorts} 
                           />
                        </div>
                      </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CohortPropertyTable({ properties, teams, events, cohorts }: PropertiesTabProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Property</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Place Value</TableHead>
          <TableHead>House Value</TableHead>
          <TableHead>Hotel Value</TableHead>
          <TableHead>Place Rent</TableHead>
          <TableHead>House Rent</TableHead>
          <TableHead>Hotel Rent</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map((prop) => (
          <TableRow key={prop.id}>
            <TableCell className="font-medium">{prop.name}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{events.find((e) => e.id === prop.eventId)?.name}</TableCell>
            <TableCell>₹{prop.baseValue?.toLocaleString() ?? '-'}</TableCell>
            <TableCell>{prop.houseValue ? `₹${prop.houseValue.toLocaleString()}` : '-'}</TableCell>
            <TableCell>{prop.hotelValue ? `₹${prop.hotelValue.toLocaleString()}` : '-'}</TableCell>
            <TableCell>₹{(prop.placeRent || prop.rentValue)?.toLocaleString() ?? '-'}</TableCell>
            <TableCell>{prop.houseRent ? `₹${prop.houseRent.toLocaleString()}` : '-'}</TableCell>
            <TableCell>{prop.hotelRent ? `₹${prop.hotelRent.toLocaleString()}` : '-'}</TableCell>
            <TableCell className="max-w-[150px] truncate">{prop.ownerTeamName ?? '-'}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-1 items-start">
                <Badge variant={prop.status === 'OWNED' ? 'default' : prop.status === 'SEIZED' ? 'destructive' : 'secondary'}>{prop.status}</Badge>
                {prop.status === 'OWNED' && prop.upgradeLevel && prop.upgradeLevel !== 'NONE' && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                    {prop.upgradeLevel}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <AssignPropertyOwnerDialog property={prop} teams={teams}>
                <Button size="sm" variant="outline">Manage</Button>
              </AssignPropertyOwnerDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
