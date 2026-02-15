import {
    collection,
    doc,
    getDoc,
    getDocs,
    runTransaction,
    writeBatch,
    query,
    where,
    Firestore,
    Timestamp,
    addDoc
} from 'firebase/firestore';
import type { Property, Team, Transaction, AuctionToken } from './types';
import { GAME_CONFIG } from './game-constants';

// Return types for UI decisions
export type LandOnPropertyResult =
    | { status: 'UNOWNED'; property: Property }
    | { status: 'OWNED_BY_SELF'; property: Property }
    | { status: 'OWNED_BY_OTHER'; property: Property; rentAmount: number; ownerName: string }
    | { status: 'ERROR'; message: string };

export async function getLandOnPropertyStatus(
    firestore: Firestore,
    propertyId: string,
    teamId: string
): Promise<LandOnPropertyResult> {
    const propertyRef = doc(firestore, 'properties', propertyId);
    const propertySnap = await getDoc(propertyRef);

    if (!propertySnap.exists()) {
        return { status: 'ERROR', message: 'Property not found' };
    }

    const property = propertySnap.data() as Property;

    if (property.status === 'UNOWNED') {
        return { status: 'UNOWNED', property };
    }

    if (property.ownerTeamId === teamId) {
        return { status: 'OWNED_BY_SELF', property };
    }

    if (property.ownerTeamId) {
        // Simple rent calculation for now. Can be expanded with multipliers/houses later.
        return {
            status: 'OWNED_BY_OTHER',
            property,
            rentAmount: property.rentValue,
            ownerName: property.ownerTeamName || 'Unknown Team'
        };
    }

    // Should not reach here
    return { status: 'ERROR', message: 'Invalid property state' };
}

export async function executePropertyPurchase(
    firestore: Firestore,
    teamId: string,
    propertyId: string,
    adminId: string,
    eventId: string
) {
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const propertyRef = doc(firestore, 'properties', propertyId);

    // Initial Read
    const [teamDoc, propertyDoc] = await Promise.all([
        getDoc(teamRef),
        getDoc(propertyRef)
    ]);

    if (!teamDoc.exists() || !propertyDoc.exists()) {
        throw new Error('Team or Property not found');
    }

    const team = teamDoc.data() as Team;
    const property = propertyDoc.data() as Property;

    if (property.status !== 'UNOWNED') {
        throw new Error('Property is already owned');
    }

    if (team.balance < property.baseValue) {
        throw new Error('Insufficient funds');
    }

    // Write Batch
    const batch = writeBatch(firestore);

    // Deduct balance
    batch.update(teamRef, {
        balance: team.balance - property.baseValue,
        // Credit score is now manually updated by admin
    });

    // Update property
    // Update property
    batch.update(propertyRef, {
        status: 'OWNED',
        ownerTeamId: team.id,
        ownerTeamName: team.name,
        upgradeLevel: 'NONE'
    });

    // Log Transaction (Subcollection)
    const transactionRef = doc(collection(firestore, 'events', eventId, 'teams', team.id, 'transactions'));
    const newTransaction: Transaction = {
        id: transactionRef.id,
        eventId: eventId,
        timestamp: new Date().toISOString(),
        fromTeamId: team.id,
        fromTeamName: team.name,
        toTeamId: null, // System
        toTeamName: 'Bank',
        adminId: adminId,
        type: 'PROPERTY_PURCHASE',
        amount: property.baseValue,
        reason: `Purchased ${property.name}`,
        balanceAfterTransaction: team.balance - property.baseValue
    };
    batch.set(transactionRef, newTransaction);

    await batch.commit();
}

export async function executeRentPayment(
    firestore: Firestore,
    fromTeamId: string,
    propertyId: string,
    adminId: string,
    eventId: string
) {
    const fromTeamRef = doc(firestore, 'events', eventId, 'teams', fromTeamId);
    const propertyRef = doc(firestore, 'properties', propertyId);

    // Initial Read
    const [fromTeamDoc, propertyDoc] = await Promise.all([
        getDoc(fromTeamRef),
        getDoc(propertyRef)
    ]);

    if (!fromTeamDoc.exists() || !propertyDoc.exists()) {
        throw new Error('Team or Property not found');
    }

    const fromTeam = fromTeamDoc.data() as Team;
    const property = propertyDoc.data() as Property;

    if (!property.ownerTeamId) {
        throw new Error('Property has no owner');
    }

    const toTeamRef = doc(firestore, 'events', eventId, 'teams', property.ownerTeamId);
    const toTeamDoc = await getDoc(toTeamRef);

    if (!toTeamDoc.exists()) {
        throw new Error("Owner team not found");
    }

    const toTeam = toTeamDoc.data() as Team;

    // Rent Amount logic
    const rentAmount = property.rentValue;

    if (fromTeam.balance < rentAmount) {
        throw new Error('INSUFFICIENT_FUNDS');
    }

    // Write Batch
    const batch = writeBatch(firestore);

    // Transfer
    batch.update(fromTeamRef, {
        balance: fromTeam.balance - rentAmount
    });

    batch.update(toTeamRef, {
        balance: toTeam.balance + rentAmount,
        // Credit score is now manually updated by admin
    });

    // Log Transaction (Payer)
    const t1Ref = doc(collection(firestore, 'events', eventId, 'teams', fromTeam.id, 'transactions'));
    const t1: Transaction = {
        id: t1Ref.id,
        eventId: eventId,
        timestamp: new Date().toISOString(),
        fromTeamId: fromTeam.id,
        fromTeamName: fromTeam.name,
        toTeamId: toTeam.id,
        toTeamName: toTeam.name,
        adminId: adminId,
        type: 'RENT',
        amount: rentAmount,
        reason: `Paid Rent for ${property.name}`,
        balanceAfterTransaction: fromTeam.balance - rentAmount
    };
    batch.set(t1Ref, t1);

    // Log Transaction (Payee)
    const t2Ref = doc(collection(firestore, 'events', eventId, 'teams', toTeam.id, 'transactions'));
    const t2: Transaction = {
        id: t2Ref.id,
        eventId: eventId,
        timestamp: new Date().toISOString(),
        fromTeamId: fromTeam.id, // Still shows who paid
        fromTeamName: fromTeam.name,
        toTeamId: toTeam.id,
        toTeamName: toTeam.name,
        adminId: adminId,
        type: 'RENT',
        amount: rentAmount,
        reason: `Received Rent for ${property.name}`,
        balanceAfterTransaction: toTeam.balance + rentAmount
    };
    batch.set(t2Ref, t2);

    await batch.commit();
}

// ... (previous code)

export async function executePassGo(
    firestore: Firestore,
    teamId: string,
    adminId: string,
    eventId: string
) {
    const SALARY_AMOUNT = GAME_CONFIG.PASS_GO_REWARD;

    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);

    // Initial Read
    const teamDoc = await getDoc(teamRef);
    if (!teamDoc.exists()) throw new Error("Team not found");

    const team = teamDoc.data() as Team;
    const newBalance = team.balance + SALARY_AMOUNT;

    // Write Batch
    const batch = writeBatch(firestore);

    batch.update(teamRef, { balance: newBalance });

    const tRef = doc(collection(firestore, 'events', eventId, 'teams', team.id, 'transactions'));
    const t: Transaction = {
        id: tRef.id,
        eventId: eventId,
        timestamp: new Date().toISOString(),
        fromTeamId: null, // System
        fromTeamName: 'Bank',
        toTeamId: team.id,
        toTeamName: team.name,
        adminId: adminId,
        type: 'REWARD', // or NEW type 'SALARY'
        amount: SALARY_AMOUNT,
        reason: 'Passed Go Salary',
        balanceAfterTransaction: newBalance
    };
    batch.set(tRef, t);

    await batch.commit();
}

export async function executeJailFine(
    firestore: Firestore,
    teamId: string,
    adminId: string,
    eventId: string
) {
    const FINE_AMOUNT = GAME_CONFIG.JAIL_FINE;

    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);

    // Initial Read
    const teamDoc = await getDoc(teamRef);
    if (!teamDoc.exists()) throw new Error("Team not found");

    const team = teamDoc.data() as Team;

    if (team.balance < FINE_AMOUNT) {
        throw new Error('Insufficient funds to pay Jail Fine');
    }

    const newBalance = team.balance - FINE_AMOUNT;

    // Write Batch
    const batch = writeBatch(firestore);

    batch.update(teamRef, { balance: newBalance });

    const tRef = doc(collection(firestore, 'events', eventId, 'teams', team.id, 'transactions'));
    const t: Transaction = {
        id: tRef.id,
        eventId: eventId,
        timestamp: new Date().toISOString(),
        fromTeamId: team.id,
        fromTeamName: team.name,
        toTeamId: null, // System
        toTeamName: 'Bank', // or Jail
        adminId: adminId,
        type: 'PENALTY',
        amount: FINE_AMOUNT,
        reason: 'Paid Jail Fine',
        balanceAfterTransaction: newBalance
    };
    batch.set(tRef, t);

    await batch.commit();
}

export async function executeTeamDefault(
    firestore: Firestore,
    teamId: string,
    adminId: string,
    reason: string,
    eventId: string
) {
    // 1. Mark Team as Eliminated
    // 2. Seize All Properties
    // 3. Convert Properties to Tokens (Simple Logic for now: 1 Property = 1 Token Candidate?)

    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);

    if (!teamDoc.exists()) throw new Error("Team not found");
    const team = teamDoc.data() as Team;

    if (team.status !== 'ACTIVE') throw new Error("Team is not active");

    const batch = writeBatch(firestore);

    // Set status to SUSPENDED (or ELIMINATED if we had that state)
    batch.update(teamRef, {
        status: 'SUSPENDED',
        isEliminated: true,
        balance: 0, // Reset balance to 0
        creditScore: 0 // Reset credit score to 0
    });

    // NOTE: Seizing assets requires querying, which is handled by 'seizeTeamAssets' helper.
    // That helper already uses writeBatch internally.
    // However, if we want strict atomicity, we'd need to merge logic, but logic separation is clearer.
    // The previous implementation ran seizing separately anyway? No, it just had placeholder comments.
    // Wait, executeTeamDefault had empty placeholder comments for seizing properties inside transaction?
    // And seizeTeamAssets was a separate function?
    // Yes. And DefaultTeamDialog calls BOTH.
    // So 'executeTeamDefault' only handles the TEAM status update.

    await batch.commit();
}

// Helper to seize properties (Non-transactional for query, transactional for update)
export async function seizeTeamAssets(firestore: Firestore, teamId: string, adminId: string, eventId: string) {
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const propertiesQuery = query(collection(firestore, 'properties'), where('ownerTeamId', '==', teamId));

    const [teamSnap, propertiesSnap] = await Promise.all([
        getDoc(teamRef),
        getDocs(propertiesQuery)
    ]);

    if (!teamSnap.exists()) throw new Error("Team not found");
    const team = teamSnap.data() as Team;

    const batch = writeBatch(firestore);

    // 1. Mark Team Eliminated
    batch.update(teamRef, {
        status: 'SUSPENDED', // Using SUSPENDED as proxy for Eliminated for now
        isEliminated: true,
        balance: 0,
        creditScore: 0
    });

    // 2. Seize Properties -> Convert to Auction Token Candidates
    // For simplicity, we turn them back to 'SEIZED' status first.
    // Later, an Admin can "Convert to Token".
    propertiesSnap.docs.forEach(propDoc => {
        const prop = propDoc.data() as Property;
        batch.update(propDoc.ref, {
            status: 'SEIZED',
            ownerTeamId: null,
            ownerTeamName: null,
            previousOwnerName: team.name
        });

        // Optional: Auto-create a Token?
        // Let's create an Auction Token for each seized property.
        const tokenRef = doc(collection(firestore, 'tokens'));
        const newToken: AuctionToken = {
            id: tokenRef.id,
            eventId: eventId,
            cohortId: prop.cohortId,
            name: `Deed: ${prop.name}`,
            description: `Seized property from ${team.name}. Grants ownership + rent rights.`,
            type: 'ACADEMIC_BOOST', // Placeholder type
            originalPropertyId: prop.id,
            isUsed: false
        };
        batch.set(tokenRef, newToken);
    });

    // 3. Log Audit / Transaction
    const logRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'transactions'));
    batch.set(logRef, {
        id: logRef.id,
        eventId: eventId,
        timestamp: new Date().toISOString(),
        fromTeamId: teamId,
        type: 'PENALTY',
        amount: 0,
        reason: 'BANKRUPTCY: Assets Seized',
        adminId: adminId
    } as Transaction);

    await batch.commit();
    return propertiesSnap.size;
}

export async function executePropertyUpgrade(
    firestore: Firestore,
    teamId: string,
    propertyId: string,
    targetLevel: 'HOUSE' | 'HOTEL',
    adminId: string,
    eventId: string
) {
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const propertyRef = doc(firestore, 'properties', propertyId);

    // Initial Read
    const [teamDoc, propertyDoc] = await Promise.all([
        getDoc(teamRef),
        getDoc(propertyRef)
    ]);

    if (!teamDoc.exists() || !propertyDoc.exists()) {
        throw new Error('Team or Property not found');
    }

    const team = teamDoc.data() as Team;
    const property = propertyDoc.data() as Property;

    if (property.ownerTeamId !== teamId) {
        throw new Error('Team does not own this property');
    }

    // Logic for House
    if (targetLevel === 'HOUSE') {
        if (property.upgradeLevel === 'HOUSE' || property.upgradeLevel === 'HOTEL') {
            throw new Error('Property already has a House or better');
        }
        if (!property.houseValue) {
            throw new Error('This property cannot have a House');
        }
        if (team.balance < property.houseValue) {
            throw new Error('Insufficient funds for House');
        }

        const cost = property.houseValue;
        const newRent = property.houseRent || property.rentValue;

        const batch = writeBatch(firestore);

        batch.update(teamRef, {
            balance: team.balance - cost
        });

        batch.update(propertyRef, {
            upgradeLevel: 'HOUSE',
            rentValue: newRent
        });

        // Log Transaction
        const tRef = doc(collection(firestore, 'events', eventId, 'teams', team.id, 'transactions'));
        const t: Transaction = {
            id: tRef.id,
            eventId: eventId,
            timestamp: new Date().toISOString(),
            fromTeamId: team.id,
            fromTeamName: team.name,
            toTeamId: null, // System
            toTeamName: 'Bank',
            adminId: adminId,
            type: 'PROPERTY_PURCHASE', // Using PROPERTY_PURCHASE for upgrades too
            amount: cost,
            reason: `Built House on ${property.name}`,
            balanceAfterTransaction: team.balance - cost
        };
        batch.set(tRef, t);

        await batch.commit();
        return;
    }

    // Logic for Hotel
    if (targetLevel === 'HOTEL') {
        if (property.upgradeLevel !== 'HOUSE') {
            throw new Error('Must build a House first before a Hotel');
        }

        if (!property.hotelValue) {
            throw new Error('This property cannot have a Hotel');
        }
        if (team.balance < property.hotelValue) {
            throw new Error('Insufficient funds for Hotel');
        }

        const cost = property.hotelValue;
        const newRent = property.hotelRent || property.rentValue;

        const batch = writeBatch(firestore);

        batch.update(teamRef, {
            balance: team.balance - cost
        });

        batch.update(propertyRef, {
            upgradeLevel: 'HOTEL',
            rentValue: newRent
        });

        const tRef = doc(collection(firestore, 'events', eventId, 'teams', team.id, 'transactions'));
        const t: Transaction = {
            id: tRef.id,
            eventId: eventId,
            timestamp: new Date().toISOString(),
            fromTeamId: team.id,
            fromTeamName: team.name,
            toTeamId: null,
            toTeamName: 'Bank',
            adminId: adminId,
            type: 'PROPERTY_PURCHASE',
            amount: cost,
            reason: `Built Hotel on ${property.name}`,
            balanceAfterTransaction: team.balance - cost
        };
        batch.set(tRef, t);

        await batch.commit();
        return;
    }
}

export async function calculateLeaderboard(
    firestore: Firestore,
    eventId: string,
    gameConfig?: { cashWeight: number; propertyWeight: number; creditWeight: number }
) {
    // defaults
    const weights = {
        cash: gameConfig?.cashWeight ?? 1,
        property: gameConfig?.propertyWeight ?? 1,
        credit: gameConfig?.creditWeight ?? 1
    };

    const teamsRef = collection(firestore, 'events', eventId, 'teams');
    const propertiesRef = collection(firestore, 'properties');

    const [teamsSnap, propertiesSnap] = await Promise.all([
        getDocs(teamsRef),
        getDocs(propertiesRef)
    ]);

    console.log(`Fetched ${teamsSnap.size} teams and ${propertiesSnap.size} properties.`);

    // Include ALL teams for final leaderboard, even suspended ones.
    const teams = teamsSnap.docs.map(d => d.data() as Team);
    // Optional: Filter out truly invalid teams if needed, but 'SUSPENDED' usually means bankrupt, they should still be ranked (likely last).

    console.log(`Teams to rank: ${teams.length}`);

    const properties = propertiesSnap.docs.map(d => d.data() as Property);

    // Calculate Scores
    const teamScores = teams.map(team => {
        const cashValue = team.balance;

        // Credit score calculation
        // If team is suspended/bankrupt, credit score might be 0, but let's use whatever is there.
        const creditValue = (team.creditScore || 0);

        const teamProperties = properties.filter(p => p.ownerTeamId === team.id);
        const propertyValue = teamProperties.reduce((sum, p) => {
            let val = p.baseValue;
            if (p.upgradeLevel === 'HOUSE') val += (p.houseValue || 0);
            if (p.upgradeLevel === 'HOTEL') val += (p.hotelValue || 0);
            return sum + val;
        }, 0);

        const score =
            (cashValue * weights.cash) +
            (propertyValue * weights.property) +
            (creditValue * weights.credit);

        console.log(`Team ${team.name} (${team.status}): Cash=${cashValue}, Prop=${propertyValue}, Credit=${creditValue} -> Score=${score}`);

        return {
            teamId: team.id,
            teamName: team.name,
            score: score,
            cohortId: team.cohortId,
            cash: cashValue,
            propertyValue: propertyValue,
            creditScore: creditValue
        };
    });

    // Sort by Score Descending
    teamScores.sort((a, b) => b.score - a.score);

    // --- Overall Ranking ---
    const overallRankings = teamScores.map((item, index) => ({
        teamId: item.teamId,
        teamName: item.teamName,
        score: item.score,
        rank: index + 1,
        cash: item.cash,
        propertyValue: item.propertyValue,
        creditScore: item.creditScore
    }));

    const eventLeaderboardRef = doc(collection(firestore, 'leaderboards'), eventId);
    const eventData = {
        id: eventId,
        eventId: eventId,
        overallRankings: overallRankings,
        rankings: overallRankings,
        updatedAt: new Date().toISOString()
    };

    // --- Cohort Rankings ---
    const cohortIds = Array.from(new Set(teamScores.map(t => t.cohortId).filter(id => !!id))) as string[];

    const cohortUpdates = cohortIds.map(cohortId => {
        const cohortTeams = teamScores.filter(t => t.cohortId === cohortId);
        cohortTeams.sort((a, b) => b.score - a.score);

        const cohortRankings = cohortTeams.map((item, index) => ({
            teamId: item.teamId,
            teamName: item.teamName,
            score: item.score,
            rank: index + 1,
            cash: item.cash,
            propertyValue: item.propertyValue,
            creditScore: item.creditScore
        }));

        const cohortRef = doc(collection(firestore, 'leaderboards'), cohortId);
        return {
            ref: cohortRef,
            data: {
                id: cohortId,
                eventId: eventId,
                cohortId: cohortId,
                rankings: cohortRankings,
                updatedAt: new Date().toISOString()
            }
        };
    });

    // Execute updates in a transaction or batch
    await runTransaction(firestore, async (transaction) => {
        // Update Event Leaderboard
        transaction.set(eventLeaderboardRef, eventData);

        // Update each Cohort Leaderboard
        for (const update of cohortUpdates) {
            transaction.set(update.ref, update.data);
        }
    });
}
