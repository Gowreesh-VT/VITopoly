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
    adminId: string
) {
    return runTransaction(firestore, async (transaction) => {
        const teamRef = doc(firestore, 'teams', teamId);
        const propertyRef = doc(firestore, 'properties', propertyId);

        const teamDoc = await transaction.get(teamRef);
        const propertyDoc = await transaction.get(propertyRef);

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

        // Deduct balance
        transaction.update(teamRef, {
            balance: team.balance - property.baseValue,
            // Credit score is now manually updated by admin
        });

        // Update property
        transaction.update(propertyRef, {
            status: 'OWNED',
            ownerTeamId: team.id,
            ownerTeamName: team.name
        });

        // Log Transaction (Subcollection)
        const transactionRef = doc(collection(firestore, 'events', team.eventId, 'teams', team.id, 'transactions'));
        const newTransaction: Transaction = {
            id: transactionRef.id,
            eventId: team.eventId,
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
        transaction.set(transactionRef, newTransaction);
    });
}

export async function executeRentPayment(
    firestore: Firestore,
    fromTeamId: string,
    propertyId: string,
    adminId: string
) {
    return runTransaction(firestore, async (transaction) => {
        const fromTeamRef = doc(firestore, 'teams', fromTeamId);
        const propertyRef = doc(firestore, 'properties', propertyId);

        const fromTeamDoc = await transaction.get(fromTeamRef);
        const propertyDoc = await transaction.get(propertyRef);

        if (!fromTeamDoc.exists() || !propertyDoc.exists()) {
            throw new Error('Team or Property not found');
        }

        const fromTeam = fromTeamDoc.data() as Team;
        const property = propertyDoc.data() as Property;

        if (!property.ownerTeamId) {
            throw new Error('Property has no owner');
        }

        const toTeamRef = doc(firestore, 'teams', property.ownerTeamId);
        const toTeamDoc = await transaction.get(toTeamRef);
        const toTeam = toTeamDoc.data() as Team;

        // Rent Amount logic
        const rentAmount = property.rentValue;

        if (fromTeam.balance < rentAmount) {
            throw new Error('INSUFFICIENT_FUNDS');
        }

        // Transfer
        transaction.update(fromTeamRef, {
            balance: fromTeam.balance - rentAmount
        });

        transaction.update(toTeamRef, {
            balance: toTeam.balance + rentAmount,
            // Credit score is now manually updated by admin
        });

        // Log Transaction (Payer)
        const t1Ref = doc(collection(firestore, 'events', fromTeam.eventId, 'teams', fromTeam.id, 'transactions'));
        const t1: Transaction = {
            id: t1Ref.id,
            eventId: fromTeam.eventId,
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
        transaction.set(t1Ref, t1);

        // Log Transaction (Payee)
        const t2Ref = doc(collection(firestore, 'events', toTeam.eventId, 'teams', toTeam.id, 'transactions'));
        const t2: Transaction = {
            id: t2Ref.id,
            eventId: toTeam.eventId,
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
        transaction.set(t2Ref, t2);
    });
}

// ... (previous code)

export async function executePassGo(
    firestore: Firestore,
    teamId: string,
    adminId: string
) {
    const SALARY_AMOUNT = 2000;

    const teamRef = doc(firestore, 'teams', teamId);
    // Use non-blocking or transaction? Transaction is safer for balance.
    return runTransaction(firestore, async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found");

        const team = teamDoc.data() as Team;
        const newBalance = team.balance + SALARY_AMOUNT;

        transaction.update(teamRef, { balance: newBalance });

        const tRef = doc(collection(firestore, 'events', team.eventId, 'teams', team.id, 'transactions'));
        const t: Transaction = {
            id: tRef.id,
            eventId: team.eventId,
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
        transaction.set(tRef, t);
    });
}

export async function executeTeamDefault(
    firestore: Firestore,
    teamId: string,
    adminId: string,
    reason: string
) {
    // 1. Mark Team as Eliminated
    // 2. Seize All Properties
    // 3. Convert Properties to Tokens (Simple Logic for now: 1 Property = 1 Token Candidate?)

    return runTransaction(firestore, async (transaction) => {
        const teamRef = doc(firestore, 'teams', teamId);
        const teamDoc = await transaction.get(teamRef);

        if (!teamDoc.exists()) throw new Error("Team not found");
        const team = teamDoc.data() as Team;

        if (team.status !== 'ACTIVE') throw new Error("Team is not active");

        // Set status to SUSPENDED (or ELIMINATED if we had that state)
        transaction.update(teamRef, {
            status: 'SUSPENDED',
            isEliminated: true,
            balance: 0 // Reset balance to 0
        });

        // Find all owned properties (requires query, so we do this outside transaction ideally, 
        // but for strict consistency we might need to be careful. 
        // Firestore transactions require reads before writes. 
        // We can't query inside transaction easily for "all properties owned by X".
        // Strategy: We fail if we can't do it atomically? 
        // OR we just do it in two steps. 
        // Step 1: Query properties. 
        // Step 2: Transactionally seize them.
    });
}

// Helper to seize properties (Non-transactional for query, transactional for update)
export async function seizeTeamAssets(firestore: Firestore, teamId: string, adminId: string) {
    const teamRef = doc(firestore, 'teams', teamId);
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
        balance: 0
    });

    // 2. Seize Properties -> Convert to Auction Token Candidates
    // For simplicity, we turn them back to 'SEIZED' status first.
    // Later, an Admin can "Convert to Token".
    propertiesSnap.docs.forEach(propDoc => {
        const prop = propDoc.data() as Property;
        batch.update(propDoc.ref, {
            status: 'SEIZED',
            ownerTeamId: null,
            ownerTeamName: null
        });

        // Optional: Auto-create a Token?
        // Let's create an Auction Token for each seized property.
        const tokenRef = doc(collection(firestore, 'tokens'));
        const newToken: AuctionToken = {
            id: tokenRef.id,
            eventId: team.eventId,
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
    const logRef = doc(collection(firestore, 'events', team.eventId, 'teams', teamId, 'transactions'));
    batch.set(logRef, {
        id: logRef.id,
        eventId: team.eventId,
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
