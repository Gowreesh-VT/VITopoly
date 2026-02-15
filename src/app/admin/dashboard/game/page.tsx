'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Cohort } from '@/lib/types';
import { ModeratorGameConsole } from '@/components/dashboard/moderator-game-console';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminGamePage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const moderatorCohortQuery = useMemoFirebase(() => (
        user ? query(collection(firestore, 'cohorts'), where('moderatorId', '==', user.uid)) : null
    ), [firestore, user]);
    const { data: moderatorCohorts, isLoading } = useCollection<Cohort>(moderatorCohortQuery);
    const moderatedCohort = moderatorCohorts?.[0];

    // If not a moderator, we might still want to show something or just a generic empty state for now?
    // The ModeratorGameConsole handles admin view vs moderator view internally?
    // Actually `ModeratorGameConsole` takes `initialCohort`. If undefined, it might show full view or empty?
    // Looking at its code previously... it seems designed for a specific cohort.
    
    if (isLoading) return <Skeleton className="h-96 w-full" />;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Live Game Console</h1>
            <ModeratorGameConsole initialCohort={moderatedCohort} />
        </div>
    );
}
