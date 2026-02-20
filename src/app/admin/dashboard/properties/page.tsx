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

    const seizedProperties = useMemo(() => {
        return filteredProperties.filter(p => p.status === 'SEIZED');
    }, [filteredProperties]);

    const activeProperties = useMemo(() => {
        return filteredProperties.filter(p => p.status !== 'SEIZED');
    }, [filteredProperties]);

    if (arePropertiesLoading) return <Skeleton className="h-64 w-full" />;

    return (
        <div className="space-y-6">
            {seizedProperties.length > 0 && (
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-destructive">Seized Assets</CardTitle>
                            <Badge variant="destructive">{seizedProperties.length}</Badge>
                        </div>
                        <CardDescription>These properties have been seized from defaulted teams and are awaiting conversion to tokens or redistribution.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PropertyTable 
                            properties={seizedProperties} 
                            teams={teamsForDisplay} 
                        />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Cohort Properties</CardTitle>
                    <CardDescription>View and manage property ownership for your cohort.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PropertyTable 
                        properties={activeProperties} 
                        teams={teamsForDisplay} 
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function PropertyTable({ properties, teams }: { properties: Property[], teams: Team[] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Property</TableHead>
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
                {properties.length === 0 && <TableRow><TableCell colSpan={10} className="text-center">No properties found.</TableCell></TableRow>}
                {properties.map((prop) => (
                    <TableRow key={prop.id}>
                        <TableCell className="font-medium">{prop.name}</TableCell>
                        <TableCell>₹{prop.baseValue?.toLocaleString() ?? '-'}</TableCell>
                        <TableCell>{prop.houseValue ? `₹${prop.houseValue.toLocaleString()}` : '-'}</TableCell>
                        <TableCell>{prop.hotelValue ? `₹${prop.hotelValue.toLocaleString()}` : '-'}</TableCell>
                        <TableCell>₹{(prop.placeRent || prop.rentValue)?.toLocaleString() ?? '-'}</TableCell>
                        <TableCell>{prop.houseRent ? `₹${prop.houseRent.toLocaleString()}` : '-'}</TableCell>
                        <TableCell>{prop.hotelRent ? `₹${prop.hotelRent.toLocaleString()}` : '-'}</TableCell>
                        <TableCell>{prop.ownerTeamName ?? '-'}</TableCell>
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
                            <AssignPropertyOwnerDialog property={prop} teams={teams ?? []}>
                                <Button size="sm" variant="outline">Manage</Button>
                            </AssignPropertyOwnerDialog>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
