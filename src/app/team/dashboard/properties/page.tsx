'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PropertyCard } from '@/components/dashboard/property-card';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import type { Team, Event, Property } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { Home } from 'lucide-react';

export default function PropertiesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const teamId = userProfile?.teamId;
  const eventId = userProfile?.eventId;

  const teamRef = useMemoFirebase(() => (teamId && eventId ? doc(firestore, 'events', eventId, 'teams', teamId) : null), [firestore, teamId, eventId]);
  const { data: team } = useDoc<Team>(teamRef);

  const propertiesQuery = useMemoFirebase(() => {
     if (!team || !eventId) return null;
     if (team.cohortId) {
         return query(collection(firestore, 'properties'), where('cohortId', '==', team.cohortId));
     }
     return query(collection(firestore, 'properties'), where('eventId', '==', eventId));
  }, [firestore, team, eventId]);
  
  const { data: allProperties, isLoading: arePropertiesLoading } = useCollection<Property>(propertiesQuery);
  
  const sortedProperties = useMemo(() => {
      if (!allProperties) return [];
      return [...allProperties].sort((a, b) => a.baseValue - b.baseValue);
  }, [allProperties]);

  const myProperties = useMemo(() => sortedProperties.filter(p => p.ownerTeamId === teamId), [sortedProperties, teamId]);

  const [propertyFilter, setPropertyFilter] = useState<'ALL' | 'MINE'>('ALL');

  if (!isClient) return <PropertiesSkeleton />;

  return (
      <div className="flex flex-col gap-6">
        <Card id="properties" className="border-2">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-2xl"><Home className="h-6 w-6" /> Property Market</CardTitle>
                    <CardDescription>View available properties and track your assets.</CardDescription>
                </div>
                <div className="flex bg-muted rounded-lg p-1 self-start md:self-auto">
                    <button 
                        onClick={() => setPropertyFilter('ALL')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${propertyFilter === 'ALL' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        All Market
                    </button>
                    <button 
                        onClick={() => setPropertyFilter('MINE')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${propertyFilter === 'MINE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        My Assets ({myProperties?.length || 0})
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                {arePropertiesLoading ? (
                    <PropertiesSkeleton />
                ) : (
                    <>
                    {propertyFilter === 'MINE' && myProperties.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Home className="h-12 w-12 mx-auto opacity-20 mb-3" />
                            <p>You don't own any properties yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {(propertyFilter === 'ALL' ? sortedProperties : myProperties).map(prop => (
                                 <PropertyCard key={prop.id} property={prop} highlightOwned={prop.ownerTeamId === teamId} />
                             ))}
                        </div>
                    )}
                    </>
                )}
            </CardContent>
        </Card>
      </div>
  );
}

function PropertiesSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
    )
}
