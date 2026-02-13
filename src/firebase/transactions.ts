'use client';
import {
  Firestore,
  doc,
  collection,
  runTransaction,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import type { PaymentRequest, Loan, Transaction, Team, Event, Notification, Cohort, Property } from '@/lib/types';
import { updateDocumentNonBlocking } from './non-blocking-updates';

/**
 * Atomically approves a payment request.
 * This involves:
 * 1. Decrementing the sender's balance.
 * 2. Incrementing the receiver's balance.
 * 3. Creating two transaction log documents (a debit and a credit).
 * 4. Creating notifications for both teams.
 * 5. Updating the payment request's status to 'APPROVED'.
 * All operations are performed in a single atomic transaction.
 *
 * @param firestore - The Firestore instance.
 * @param req - The PaymentRequest object to be approved.
 * @param adminId - The UID of the admin approving the request.
 * @throws Throws an error if the transaction fails (e.g., insufficient funds).
 */
export async function approvePaymentRequest(
  firestore: Firestore,
  req: PaymentRequest,
  adminId: string
): Promise<void> {
  const fromTeamRef = doc(firestore, 'events', req.eventId, 'teams', req.fromTeamId);
  const toTeamRef = doc(firestore, 'events', req.eventId, 'teams', req.toTeamId);
  const paymentRequestRef = doc(firestore, 'events', req.eventId, 'payment_requests', req.id);
  
  const fromTeamTxRef = doc(collection(firestore, 'events', req.eventId, 'teams', req.fromTeamId, 'transactions'));
  const toTeamTxRef = doc(collection(firestore, 'events', req.eventId, 'teams', req.toTeamId, 'transactions'));
  const fromTeamNotificationRef = doc(collection(firestore, 'events', req.eventId, 'teams', req.fromTeamId, 'notifications'));
  const toTeamNotificationRef = doc(collection(firestore, 'events', req.eventId, 'teams', req.toTeamId, 'notifications'));


  await runTransaction(firestore, async (transaction) => {
    const fromTeamDoc = await transaction.get(fromTeamRef);
    const toTeamDoc = await transaction.get(toTeamRef);

    if (!fromTeamDoc.exists() || !toTeamDoc.exists()) {
      throw new Error("One or both teams involved in the transaction could not be found.");
    }

    const fromTeamData = fromTeamDoc.data() as Team;
    const toTeamData = toTeamDoc.data() as Team;

    if (fromTeamData.balance < req.amount) {
      throw new Error(`Team "${fromTeamData.name}" has insufficient funds to complete this payment.`);
    }

    const newFromBalance = fromTeamData.balance - req.amount;
    const newToBalance = toTeamData.balance + req.amount;
    const timestamp = new Date().toISOString();

    // 1. Update team balances
    transaction.update(fromTeamRef, { balance: newFromBalance });
    transaction.update(toTeamRef, { balance: newToBalance });

    // 2. Create transaction logs
    const baseTransaction: Omit<Transaction, 'id' | 'balanceAfterTransaction'> = {
      eventId: req.eventId,
      timestamp: timestamp,
      adminId: adminId,
      type: 'SETTLEMENT',
      amount: req.amount,
      reason: req.reason,
      fromTeamId: req.fromTeamId,
      fromTeamName: req.fromTeamName,
      toTeamId: req.toTeamId,
      toTeamName: req.toTeamName,
    };

    transaction.set(fromTeamTxRef, { ...baseTransaction, id: fromTeamTxRef.id, balanceAfterTransaction: newFromBalance });
    transaction.set(toTeamTxRef, { ...baseTransaction, id: toTeamTxRef.id, balanceAfterTransaction: newToBalance });

    // 3. Create notifications
    transaction.set(fromTeamNotificationRef, {
        id: fromTeamNotificationRef.id, eventId: req.eventId, teamId: req.fromTeamId,
        title: 'Payment Approved',
        message: `Your payment of $${req.amount.toLocaleString()} to ${req.toTeamName} was approved.`,
        read: false, timestamp, type: 'payment-approved',
    });
    transaction.set(toTeamNotificationRef, {
        id: toTeamNotificationRef.id, eventId: req.eventId, teamId: req.toTeamId,
        title: 'Payment Received',
        message: `You received a payment of $${req.amount.toLocaleString()} from ${req.fromTeamName}.`,
        read: false, timestamp, type: 'payment-received',
    });

    // 4. Update payment request status
    transaction.update(paymentRequestRef, { status: 'APPROVED' });
  });
}

/**
 * Rejects a payment request and notifies the sender.
 *
 * @param firestore - The Firestore instance.
 * @param req - The PaymentRequest object to be rejected.
 */
export async function rejectPaymentRequest(
  firestore: Firestore,
  req: PaymentRequest
): Promise<void> {
  const batch = writeBatch(firestore);
  const paymentRequestRef = doc(firestore, 'events', req.eventId, 'payment_requests', req.id);
  const notificationRef = doc(collection(firestore, 'events', req.eventId, 'teams', req.fromTeamId, 'notifications'));

  // Update request status
  batch.update(paymentRequestRef, { status: 'REJECTED' });

  // Create notification for the sender
  const notification: Notification = {
    id: notificationRef.id,
    eventId: req.eventId,
    teamId: req.fromTeamId,
    title: 'Payment Rejected',
    message: `Your request to pay ${req.toTeamName} $${req.amount.toLocaleString()} was rejected.`,
    read: false,
    timestamp: new Date().toISOString(),
    type: 'payment-rejected'
  };
  batch.set(notificationRef, notification);
  
  await batch.commit();
}


export interface IssueLoanPayload {
    eventId: string;
    teamId: string;
    adminId: string;
    amount: number;
    reason: string;
}

/**
 * Atomically issues a loan to a team and notifies them.
 * This involves:
 * 1. Creating a new Loan document.
 * 2. Incrementing the team's balance.
 * 3. Creating a transaction log for the loan issuance.
 * 4. Creating a notification for the team.
 * All operations are performed in a single atomic transaction.
 *
 * @param firestore - The Firestore instance.
 * @param payload - The necessary data to issue a loan.
 * @throws Throws an error if the transaction fails.
 */
export async function issueLoan(
  firestore: Firestore,
  payload: IssueLoanPayload
): Promise<void> {
    const { eventId, teamId, adminId, amount, reason } = payload;

    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const eventRef = doc(firestore, 'events', eventId);
    const loanRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'loans'));
    const transactionRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'transactions'));
    const notificationRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'notifications'));

    await runTransaction(firestore, async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        const eventDoc = await transaction.get(eventRef);

        if (!teamDoc.exists()) throw new Error("Team not found.");
        if (!eventDoc.exists()) throw new Error("Event not found.");
        
        const teamData = teamDoc.data() as Team;
        const eventData = eventDoc.data() as Event;

        if (teamData.hasActiveLoan) {
            throw new Error(`${teamData.name} already has an active loan.`);
        }
        if (amount > eventData.loanLimit) {
            throw new Error(`Loan amount exceeds the event limit of $${eventData.loanLimit.toLocaleString()}.`);
        }

        const newBalance = teamData.balance + amount;
        const newCreditScore = teamData.creditScore - 5;
        const timestamp = new Date().toISOString();

        transaction.update(teamRef, { 
            balance: newBalance, 
            creditScore: newCreditScore,
            hasActiveLoan: true,
            activeLoanId: loanRef.id,
        });

        const newLoan: Loan = {
            id: loanRef.id, eventId, teamId, adminId, amount,
            issueTime: timestamp, status: 'ACTIVE',
        };
        transaction.set(loanRef, newLoan);

        const newTransaction: Transaction = {
            id: transactionRef.id, eventId, timestamp, adminId, amount, reason,
            fromTeamId: null, fromTeamName: 'Bank',
            toTeamId: teamId, toTeamName: teamData.name,
            type: 'LOAN_ISSUED', balanceAfterTransaction: newBalance,
        };
        transaction.set(transactionRef, newTransaction);
        
        const newNotification: Notification = {
            id: notificationRef.id, eventId, teamId,
            title: 'Loan Issued',
            message: `A loan of $${amount.toLocaleString()} has been issued to your team.`,
            read: false, timestamp, type: 'loan-issued',
        };
        transaction.set(notificationRef, newNotification);
    });
}

export interface CreditDebitPayload {
    eventId: string;
    teamId: string;
    adminId: string;
    amount: number;
    reason: string;
}

export async function creditTeam(firestore: Firestore, payload: CreditDebitPayload): Promise<void> {
    const { eventId, teamId, adminId, amount, reason } = payload;
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const transactionRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'transactions'));
    const notificationRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'notifications'));

    await runTransaction(firestore, async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found.");
        
        const teamData = teamDoc.data() as Team;
        const newBalance = teamData.balance + amount;
        const newCreditScore = teamData.creditScore + 2;
        const timestamp = new Date().toISOString();

        transaction.update(teamRef, { balance: newBalance, creditScore: newCreditScore });

        const newTransaction: Transaction = {
            id: transactionRef.id, eventId, timestamp, adminId, amount, reason,
            fromTeamId: null, fromTeamName: 'Bank',
            toTeamId: teamId, toTeamName: teamData.name,
            type: 'REWARD', balanceAfterTransaction: newBalance,
        };
        transaction.set(transactionRef, newTransaction);
        
        const newNotification: Notification = {
            id: notificationRef.id, eventId, teamId,
            title: `You've Received a Reward!`,
            message: `Your account has been credited with $${amount.toLocaleString()}. Reason: ${reason}.`,
            read: false, timestamp, type: 'reward-received',
        };
        transaction.set(notificationRef, newNotification);
    });
}

export async function debitTeam(firestore: Firestore, payload: CreditDebitPayload): Promise<void> {
    const { eventId, teamId, adminId, amount, reason } = payload;
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const transactionRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'transactions'));
    const notificationRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'notifications'));

    await runTransaction(firestore, async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found.");

        const teamData = teamDoc.data() as Team;
        if (teamData.balance < amount) throw new Error("Team has insufficient funds.");

        const newBalance = teamData.balance - amount;
        const newCreditScore = teamData.creditScore - 2;
        const timestamp = new Date().toISOString();

        transaction.update(teamRef, { balance: newBalance, creditScore: newCreditScore });

        const newTransaction: Transaction = {
            id: transactionRef.id, eventId, timestamp, adminId, amount, reason,
            fromTeamId: teamId, fromTeamName: teamData.name,
            toTeamId: null, toTeamName: 'Bank',
            type: 'PENALTY', balanceAfterTransaction: newBalance,
        };
        transaction.set(transactionRef, newTransaction);
        
        const newNotification: Notification = {
            id: notificationRef.id, eventId, teamId,
            title: 'Penalty Incurred',
            message: `Your account has been debited by $${amount.toLocaleString()}. Reason: ${reason}.`,
            read: false, timestamp, type: 'penalty-incurred',
        };
        transaction.set(notificationRef, newNotification);
    });
}

export interface RepayLoanPayload {
    eventId: string;
    teamId: string;
    loanId: string;
    amount: number;
    adminId: string;
}

export async function repayLoan(firestore: Firestore, payload: RepayLoanPayload): Promise<void> {
    const { eventId, teamId, loanId, amount, adminId } = payload;
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const loanRef = doc(firestore, 'events', eventId, 'teams', teamId, 'loans', loanId);
    const transactionRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'transactions'));
    const notificationRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'notifications'));

    await runTransaction(firestore, async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        const loanDoc = await transaction.get(loanRef);

        if (!teamDoc.exists()) throw new Error("Team not found.");
        if (!loanDoc.exists()) throw new Error("Loan not found.");

        const teamData = teamDoc.data() as Team;
        if (teamData.balance < amount) throw new Error("Team has insufficient funds to repay the loan.");
        if (loanDoc.data().status !== 'ACTIVE') throw new Error("This loan is not active.");

        const newBalance = teamData.balance - amount;
        const newCreditScore = teamData.creditScore + 5;
        const timestamp = new Date().toISOString();

        transaction.update(teamRef, { 
            balance: newBalance, 
            creditScore: newCreditScore,
            hasActiveLoan: false,
            activeLoanId: null,
        });
        transaction.update(loanRef, { status: 'REPAID' });

        const newTransaction: Transaction = {
            id: transactionRef.id, eventId, timestamp, adminId, amount,
            fromTeamId: teamId, fromTeamName: teamData.name,
            toTeamId: null, toTeamName: 'Bank',
            type: 'LOAN_REPAID', reason: `Repayment of loan`,
            balanceAfterTransaction: newBalance,
        };
        transaction.set(transactionRef, newTransaction);
        
        const newNotification: Notification = {
            id: notificationRef.id, eventId, teamId,
            title: 'Loan Repaid',
            message: `Your loan of $${amount.toLocaleString()} has been successfully repaid.`,
            read: false, timestamp, type: 'loan-repaid',
        };
        transaction.set(notificationRef, newNotification);
    });
}


export interface AdjustBalancePayload {
    eventId: string;
    teamId: string;
    adminId: string;
    amount: number;
    reason: string;
    direction: 'credit' | 'debit';
}

export async function adjustTeamBalance(firestore: Firestore, payload: AdjustBalancePayload): Promise<void> {
    const { eventId, teamId, adminId, amount, reason, direction } = payload;

    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const transactionRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'transactions'));

    await runTransaction(firestore, async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) {
            throw new Error("Team not found. Cannot adjust balance.");
        }
        const teamData = teamDoc.data() as Team;

        const newBalance = direction === 'credit'
            ? teamData.balance + amount
            : teamData.balance - amount;

        if (newBalance < 0) {
            throw new Error("This adjustment would result in a negative balance.");
        }

        const timestamp = new Date().toISOString();

        // 1. Update team balance
        transaction.update(teamRef, { balance: newBalance });

        // 2. Create transaction log
        const newTransaction: Transaction = {
            id: transactionRef.id,
            eventId,
            timestamp,
            fromTeamId: null,
            fromTeamName: 'Super Admin',
            toTeamId: teamId,
            toTeamName: teamData.name,
            adminId,
            type: 'SUPER_ADMIN_OVERRIDE',
            amount,
            reason,
            balanceAfterTransaction: newBalance,
        };
        transaction.set(transactionRef, newTransaction);
    });
}

export interface CreateTeamPayload {
    eventId: string;
    teamName: string;
    initialBalance: number;
    adminId: string;
}

export async function createTeam(firestore: Firestore, payload: CreateTeamPayload): Promise<void> {
    const { eventId, teamName, initialBalance, adminId } = payload;
    
    const batch = writeBatch(firestore);

    // 1. Create the new team document
    const teamRef = doc(collection(firestore, 'events', eventId, 'teams'));
    const newTeam: Omit<Team, 'qualifiedToNextRound' | 'currentScore' | 'rankInCohort'> = {
        id: teamRef.id,
        eventId,
        name: teamName,
        balance: initialBalance,
        creditScore: 100, // Default credit score
        status: 'ACTIVE',
        hasActiveLoan: false,
        activeLoanId: null,
        cohortId: null,
        isEliminated: false,
    };
    batch.set(teamRef, newTeam);

    // 2. Create the initial credit transaction for the team
    if (initialBalance > 0) {
        const transactionRef = doc(collection(firestore, 'events', eventId, 'teams', teamRef.id, 'transactions'));
        const newTransaction: Transaction = {
            id: transactionRef.id,
            eventId,
            timestamp: new Date().toISOString(),
            fromTeamId: null,
            fromTeamName: 'System',
            toTeamId: teamRef.id,
            toTeamName: teamName,
            adminId,
            type: 'SYSTEM_CREDIT',
            amount: initialBalance,
            reason: 'Initial opening balance',
            balanceAfterTransaction: initialBalance,
        };
        batch.set(transactionRef, newTransaction);
    }
    
    await batch.commit();
}


export interface ForceRepayLoanPayload {
    eventId: string;
    teamId: string;
    loanId: string;
    adminId: string;
}

export async function forceRepayLoan(firestore: Firestore, payload: ForceRepayLoanPayload): Promise<void> {
    const { eventId, teamId, loanId, adminId } = payload;

    const loanRef = doc(firestore, 'events', eventId, 'teams', teamId, 'loans', loanId);
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const transactionRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'transactions'));

    await runTransaction(firestore, async (transaction) => {
        const loanDoc = await transaction.get(loanRef);
        const teamDoc = await transaction.get(teamRef);

        if (!loanDoc.exists() || !teamDoc.exists()) {
            throw new Error("Loan or Team not found.");
        }
        const loanData = loanDoc.data() as Loan;
        const teamData = teamDoc.data() as Team;

        // 1. Update loan status
        transaction.update(loanRef, { status: 'REPAID' });
        transaction.update(teamRef, { hasActiveLoan: false, activeLoanId: null });

        // 2. Create a transaction log for the force-repayment
        const newTransaction: Transaction = {
            id: transactionRef.id,
            eventId,
            timestamp: new Date().toISOString(),
            fromTeamId: teamId, // The team is "paying"
            fromTeamName: teamData.name,
            toTeamId: null, // To the bank
            toTeamName: "Bank",
            adminId,
            type: 'LOAN_REPAID',
            amount: loanData.amount,
            reason: 'Loan forced to REPAID by Super Admin.',
            // Balance is NOT affected, this is an administrative record closing the loan.
            balanceAfterTransaction: teamData.balance,
        };
        transaction.set(transactionRef, newTransaction);
    });
}

export async function markNotificationsAsRead(
    firestore: Firestore,
    eventId: string,
    teamId: string,
    notificationIds: string[]
): Promise<void> {
    const batch = writeBatch(firestore);

    notificationIds.forEach(id => {
        const notifRef = doc(firestore, 'events', eventId, 'teams', teamId, 'notifications', id);
        batch.update(notifRef, { read: true });
    });

    await batch.commit();
}

export async function assignPropertyOwner(firestore: Firestore, { eventId, propertyId, newOwnerTeamId, adminId }: { eventId: string, propertyId: string, newOwnerTeamId: string | null, adminId: string }): Promise<void> {
    await runTransaction(firestore, async (transaction) => {
        const propertyRef = doc(firestore, 'properties', propertyId);
        const propertyDoc = await transaction.get(propertyRef);

        if (!propertyDoc.exists()) {
            throw new Error("Property not found.");
        }
        const propertyData = propertyDoc.data() as Property;

        let ownerTeamName: string | null = null;
        if (newOwnerTeamId) {
            const teamRef = doc(firestore, 'events', eventId, 'teams', newOwnerTeamId);
            const teamDoc = await transaction.get(teamRef);
            if (!teamDoc.exists()) {
                throw new Error("New owner team not found.");
            }
            const teamData = teamDoc.data() as Team;
            ownerTeamName = teamData.name;

            // Deduct property value from new owner's balance
            const newBalance = teamData.balance - propertyData.baseValue;
            if (newBalance < 0) {
                throw new Error("New owner has insufficient funds.");
            }
            transaction.update(teamRef, { balance: newBalance });

            // Create transaction log for the purchase
            const txRef = doc(collection(firestore, 'events', eventId, 'teams', newOwnerTeamId, 'transactions'));
            const newTx: Transaction = {
                id: txRef.id,
                eventId,
                timestamp: new Date().toISOString(),
                fromTeamId: newOwnerTeamId,
                fromTeamName: ownerTeamName,
                toTeamId: null,
                toTeamName: "Property Seller",
                adminId,
                type: 'PROPERTY_PURCHASE',
                amount: propertyData.baseValue,
                reason: `Purchase of property: ${propertyData.name}`,
                balanceAfterTransaction: newBalance,
            };
            transaction.set(txRef, newTx);
        }

        transaction.update(propertyRef, {
            ownerTeamId: newOwnerTeamId,
            ownerTeamName: ownerTeamName,
            status: newOwnerTeamId ? 'OWNED' : 'UNOWNED'
        });
    });
}

export async function addTeamToCohort(firestore: Firestore, { cohortId, teamId, eventId }: { cohortId: string, teamId: string, eventId: string }) {
    const cohortRef = doc(firestore, 'cohorts', cohortId);
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    
    const batch = writeBatch(firestore);
    batch.update(cohortRef, { teamIds: arrayUnion(teamId) });
    batch.update(teamRef, { cohortId: cohortId });
    await batch.commit();
}

export async function removeTeamFromCohort(firestore: Firestore, { cohortId, teamId, eventId }: { cohortId: string, teamId: string, eventId: string }) {
    const cohortRef = doc(firestore, 'cohorts', cohortId);
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    
    const batch = writeBatch(firestore);
    batch.update(cohortRef, { teamIds: arrayRemove(teamId) });
    batch.update(teamRef, { cohortId: null });
    await batch.commit();
}

export async function adjustTeamCreditScore(firestore: Firestore, payload: {
    eventId: string;
    teamId: string;
    adminId: string;
    amount: number;
    reason: string;
}): Promise<void> {
    const { eventId, teamId, adminId, amount, reason } = payload;
    const teamRef = doc(firestore, 'events', eventId, 'teams', teamId);
    const transactionRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'transactions'));
    const notificationRef = doc(collection(firestore, 'events', eventId, 'teams', teamId, 'notifications'));

    await runTransaction(firestore, async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        if (!teamDoc.exists()) throw new Error("Team not found.");
        
        const teamData = teamDoc.data() as Team;
        // Apply the change
        const newCreditScore = (teamData.creditScore || 0) + amount;
        
        const timestamp = new Date().toISOString();

        transaction.update(teamRef, { creditScore: newCreditScore });

        const newTransaction: Transaction = {
            id: transactionRef.id,
            eventId,
            timestamp,
            adminId,
            amount, // Storing the score change amount here
            reason,
            fromTeamId: null,
            fromTeamName: 'Super Admin',
            toTeamId: teamId,
            toTeamName: teamData.name,
            type: 'CREDIT_SCORE_ADJUSTMENT',
            balanceAfterTransaction: teamData.balance, // Balance doesn't change
        };
        transaction.set(transactionRef, newTransaction);
        
        const changeType = amount >= 0 ? 'increased' : 'decreased';
        const newNotification: Notification = {
            id: notificationRef.id,
            eventId,
            teamId,
            title: 'Credit Score Updated',
            message: `Your credit score has been ${changeType} by ${Math.abs(amount)}. Reason: ${reason}.`,
            read: false,
            timestamp,
            type: 'credit-score-updated',
        };
        transaction.set(notificationRef, newNotification);
    });
}
