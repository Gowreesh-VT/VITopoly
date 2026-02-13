import { collection, collectionGroup, writeBatch, doc, getDocs, query, where, Firestore } from 'firebase/firestore';
import { BASE_PROPERTIES, AUCTION_TOKENS_CATALOG } from './game-constants';
import type { Property, Cohort, Team } from './types';

export async function createCohorts(firestore: Firestore, eventId: string, numberOfCohorts: number) {
    // Fix: Teams are nested, so use collectionGroup to find them
    const teamsQuery = query(collectionGroup(firestore, 'teams'), where('eventId', '==', eventId));
    const snapshot = await getDocs(teamsQuery);

    // Validate we found teams
    if (snapshot.empty) {
        throw new Error(`No teams found for eventId: ${eventId}`);
    }

    // Store refs to easily update them later without reconstructing paths
    const teamDocs = snapshot.docs.map(d => ({
        data: d.data() as Team,
        ref: d.ref
    }));
    const teams = teamDocs.map(t => t.data);

    console.log("createCohorts Debug:", {
        queriedEventId: eventId,
        teamsFound: teams.length,
        firstTeam: teams[0]
    });

    // Validation: Max 5 teams per cohort
    if (teams.length > numberOfCohorts * 5) {
        throw new Error(`Too many teams (${teams.length}) for ${numberOfCohorts} cohorts. Max allowed is ${numberOfCohorts * 5} (5 per cohort).`);
    }

    const cohorts: Cohort[] = [];

    // Initialize Empty Cohorts
    for (let i = 0; i < numberOfCohorts; i++) {
        const cohortId = `cohort_${i + 1}`;
        cohorts.push({
            id: cohortId,
            eventId: eventId,
            name: `Cohort ${i + 1}`,
            teamIds: [],
            moderatorId: '',
            status: 'WAITING',
        });
    }

    // Round-Robin Assignment
    teams.forEach((team, index) => {
        const cohortIndex = index % numberOfCohorts;
        cohorts[cohortIndex].teamIds.push(team.id);
    });

    const batch = writeBatch(firestore);
    const cohortsRef = collection(firestore, 'cohorts');

    // Save Cohorts
    cohorts.forEach(cohort => {
        const ref = doc(cohortsRef, cohort.id);
        batch.set(ref, cohort);
    });

    // Update Teams with new Cohort ID
    cohorts.forEach(cohort => {
        cohort.teamIds.forEach(teamId => {
            const teamDoc = teamDocs.find(t => t.data.id === teamId);
            if (teamDoc) {
                batch.update(teamDoc.ref, { cohortId: cohort.id });
            }
        });
    });

    await batch.commit();
    return cohorts.length;
}

export async function initializeCohortProperties(firestore: Firestore, eventId: string) {
    // 1. Get all cohorts
    const cohortsRef = collection(firestore, 'cohorts');
    const q = query(cohortsRef, where('eventId', '==', eventId));
    const snapshot = await getDocs(q);
    const cohorts = snapshot.docs.map(d => d.data() as Cohort);

    const batch = writeBatch(firestore);
    const propertiesRef = collection(firestore, 'properties');

    let totalProperties = 0;

    cohorts.forEach(cohort => {
        BASE_PROPERTIES.forEach((prop) => {
            const newPropRef = doc(propertiesRef);
            // Create a property document
            const newProperty: Property = {
                id: newPropRef.id,
                eventId: eventId,
                name: `${prop.name}`,
                cohortId: cohort.id,
                baseValue: prop.baseValue,
                rentValue: prop.rentValue,
                status: 'UNOWNED',
                ownerTeamId: null,
                ownerTeamName: null,
            };
            batch.set(newPropRef, newProperty);
            totalProperties++;
        });
    });

    await batch.commit();
    console.log(`Initialized ${totalProperties} properties across ${cohorts.length} cohorts.`);
    return totalProperties;
}

export async function initializeAuctionTokens(firestore: Firestore, eventId: string, cohortId: string) {
    // Placeholder
}

export async function resetRound2Data(firestore: Firestore, eventId: string) {
    // 1. Delete all Properties for this event
    const propertiesRef = collection(firestore, 'properties');
    const qProps = query(propertiesRef, where('eventId', '==', eventId));
    const snapProps = await getDocs(qProps);

    // 2. Delete all Cohorts for this event
    const cohortsRef = collection(firestore, 'cohorts');
    const qCohorts = query(cohortsRef, where('eventId', '==', eventId));
    const snapCohorts = await getDocs(qCohorts);

    const batch = writeBatch(firestore);
    let operationCount = 0;

    snapProps.docs.forEach(doc => {
        batch.delete(doc.ref);
        operationCount++;
    });

    snapCohorts.docs.forEach(doc => {
        batch.delete(doc.ref);
        operationCount++;
    });

    // 3. Reset Teams (remove cohortId)
    // Note: This might be expensive if many teams.
    // 3. Reset Teams (remove cohortId)
    // Note: This might be expensive if many teams.
    const teamsRef = collection(firestore, 'events', eventId, 'teams');
    const snapTeams = await getDocs(teamsRef);

    snapTeams.docs.forEach(doc => {
        // Only update if they have a cohortId
        if (doc.data().cohortId) {
            batch.update(doc.ref, {
                cohortId: null,
                // Optional: Reset balance/inventory? Better not, unless explicitly asked.
            });
            operationCount++;
        }
    });

    // Firestore batch limit is 500. We might need to chunk if > 500.
    // For 15 cohorts * 20 props = 300 props + 15 cohorts + 75 teams = ~390 ops. Safe for one batch.
    if (operationCount > 0) {
        await batch.commit();
    }

    return operationCount;
}
