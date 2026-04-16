'use client';

import { useMemo } from 'react';
import { collection, collectionGroup, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useGameConfig } from '@/firebase';
import type {
  Team,
  Transaction,
  Admin,
  Loan,
  Event,
  UserProfile,
  Cohort,
  Property,
  Leaderboard,
} from '@/lib/types';

export function useSuperAdminData() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { gameConfig, isGameConfigLoading } = useGameConfig();

  const { data: events, isLoading: areEventsLoading } = useCollection<Event>(
    useMemoFirebase(() => query(collection(firestore, 'events'), orderBy('startDate', 'desc')), [firestore]),
  );

  const { data: teams, isLoading: areTeamsLoading } = useCollection<Team>(
    useMemoFirebase(() => query(collectionGroup(firestore, 'teams'), orderBy('name')), [firestore]),
  );

  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => collection(firestore, 'users'), [firestore]),
  );

  const { data: admins, isLoading: areAdminsLoading } = useCollection<Admin>(
    useMemoFirebase(() => collectionGroup(firestore, 'admins'), [firestore]),
  );

  const { data: ledger, isLoading: isLedgerLoading } = useCollection<Transaction>(
    useMemoFirebase(() => query(collectionGroup(firestore, 'transactions'), orderBy('timestamp', 'desc')), [firestore]),
  );

  const { data: loans, isLoading: areLoansLoading } = useCollection<Loan>(
    useMemoFirebase(() => collectionGroup(firestore, 'loans'), [firestore]),
  );

  const { data: cohorts, isLoading: areCohortsLoading } = useCollection<Cohort>(
    useMemoFirebase(() => query(collection(firestore, 'cohorts'), orderBy('name')), [firestore]),
  );

  const { data: properties, isLoading: arePropertiesLoading } = useCollection<Property>(
    useMemoFirebase(() => query(collection(firestore, 'properties'), orderBy('name')), [firestore]),
  );

  const { data: leaderboards, isLoading: areLeaderboardsLoading } = useCollection<Leaderboard>(
    useMemoFirebase(() => collection(firestore, 'leaderboards'), [firestore]),
  );

  const isLoading =
    areTeamsLoading ||
    areAdminsLoading ||
    isLedgerLoading ||
    areLoansLoading ||
    areEventsLoading ||
    areUsersLoading ||
    isGameConfigLoading ||
    areCohortsLoading ||
    arePropertiesLoading ||
    areLeaderboardsLoading;

  const totalVCash = useMemo(
    () => teams?.reduce((sum, team) => sum + team.balance, 0) ?? 0,
    [teams],
  );

  const totalActiveLoans = useMemo(
    () => loans?.filter((l) => l.status === 'ACTIVE').reduce((sum, loan) => sum + loan.amount, 0) ?? 0,
    [loans],
  );

  const averageCreditScore = useMemo(
    () => (!teams || teams.length === 0 ? 0 : Math.round(teams.reduce((sum, t) => sum + t.creditScore, 0) / teams.length)),
    [teams],
  );

  return {
    user,
    firestore,
    gameConfig,
    events: events ?? [],
    teams: teams ?? [],
    users: users ?? [],
    admins: admins ?? [],
    ledger: ledger ?? [],
    loans: loans ?? [],
    cohorts: cohorts ?? [],
    properties: properties ?? [],
    leaderboards: leaderboards ?? [],
    isLoading,
    totalVCash,
    totalActiveLoans,
    averageCreditScore,
  };
}
