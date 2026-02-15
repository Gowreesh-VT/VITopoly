'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Property, Cohort, Team } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { AssignPropertyOwnerDialog } from '@/components/dashboard/assign-property-owner-dialog';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminPropertiesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const eventId = userProfile?.eventId;

    const moderatorCohortQuery = useMemoFirebase(() => (
        user ? query(collection(firestore, 'cohorts'), where('moderatorId', '==', user.uid)) : null
    ), [firestore, user]);
    const { data: moderatorCohorts } = useCollection<Cohort>(moderatorCohortQuery);
    const moderatedCohort = moderatorCohorts?.[0];

    const propertiesQuery = useMemoFirebase(() => (
        eventId ? query(collection(firestore, 'properties'), where('eventId', '==', eventId)) : null
    ), [firestore, eventId]);
    const { data: properties, isLoading: arePropertiesLoading } = useCollection<Property>(propertiesQuery);

    const teamsQuery = useMemoFirebase(() => (
        eventId ? query(collection(firestore, 'events', eventId, 'teams')) : null
    ), [firestore, eventId]);
    const { data: teams } = useCollection<Team>(teamsQuery);

    const teamsForDisplay = useMemo(() => {
        if (!teams) return [];
        if (moderatedCohort) {
            return teams.filter(team => moderatedCohort.teamIds.includes(team.id));
        }
        return teams;
    }, [teams, moderatedCohort]);

    const filteredProperties = useMemo(() => {
        if (!properties) return [];
        if (moderatedCohort) {
            return properties.filter(p => p.cohortId === moderatedCohort.id);
        }
        return properties;
    }, [properties, moderatedCohort]);

    if (arePropertiesLoading) return <Skeleton className="h-64 w-full" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cohort Properties</CardTitle>
                <CardDescription>View and manage property ownership for your cohort.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Property</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead className="hidden md:table-cell">Current State</TableHead>
                            <TableHead className="hidden md:table-cell">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProperties.length === 0 && <TableRow><TableCell colSpan={6} className="text-center">No properties found.</TableCell></TableRow>}
                        {filteredProperties.map((prop) => (
                            <TableRow key={prop.id}>
                                <TableCell className="font-medium">{prop.name}</TableCell>
                                <TableCell>{formatCurrency(prop.baseValue)}</TableCell>
                                <TableCell>{prop.ownerTeamName ?? '-'}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                    {prop.upgradeLevel === 'HOUSE' && <Badge className="bg-blue-500">House</Badge>}
                                    {prop.upgradeLevel === 'HOTEL' && <Badge className="bg-red-500">Hotel</Badge>}
                                    {(!prop.upgradeLevel || prop.upgradeLevel === 'NONE') && <Badge variant="outline">Site Only</Badge>}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <Badge variant={prop.status === 'OWNED' ? 'default' : 'secondary'}>{prop.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <AssignPropertyOwnerDialog property={prop} teams={teamsForDisplay ?? []}>
                                        <Button size="sm" variant="outline">Manage</Button>
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
