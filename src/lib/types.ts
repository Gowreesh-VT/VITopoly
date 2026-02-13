import { type User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  teamId?: string;
  eventId?: string;
};

// This extends the FirebaseUser to include our app-specific 'role'
export type AppUser = FirebaseUser & {
  role?: UserRole;
};

export type Team = {
  id: string;
  eventId: string;
  name: string;
  balance: number;
  creditScore: number;
  status: 'ACTIVE' | 'SUSPENDED';
  hasActiveLoan?: boolean;
  activeLoanId?: string | null;
  cohortId?: string | null;
  isEliminated: boolean;
  qualifiedToNextRound?: boolean;
  currentScore?: number;
  rankInCohort?: number;
};

export type TransactionType =
  | 'SYSTEM_CREDIT'
  | 'REWARD'
  | 'PENALTY'
  | 'RENT'
  | 'SETTLEMENT'
  | 'LOAN_ISSUED'
  | 'LOAN_REPAID'
  | 'SUPER_ADMIN_OVERRIDE'
  | 'PROPERTY_PURCHASE'
  | 'TOKEN_ACTION'
  | 'CREDIT_SCORE_ADJUSTMENT';

export const TRANSACTION_TYPES: TransactionType[] = [
  'SYSTEM_CREDIT',
  'REWARD',
  'PENALTY',
  'RENT',
  'SETTLEMENT',
  'LOAN_ISSUED',
  'LOAN_REPAID',
  'SUPER_ADMIN_OVERRIDE',
  'PROPERTY_PURCHASE',
  'TOKEN_ACTION',
  'CREDIT_SCORE_ADJUSTMENT',
];

export type Transaction = {
  id: string;
  eventId: string;
  timestamp: string;
  fromTeamId: string | null;
  fromTeamName?: string;
  toTeamId: string | null;
  toTeamName?: string;
  adminId: string | null;
  type: TransactionType;
  amount: number;
  reason: string;
  balanceAfterTransaction?: number;
};

export type Loan = {
  id: string;
  eventId: string;
  teamId: string;
  adminId: string;
  amount: number;
  issueTime: string;
  status: 'ACTIVE' | 'REPAID';
};

export type Notification = {
  id: string;
  eventId: string;
  teamId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  type: string;
};

export type PaymentRequest = {
  id: string;
  eventId: string;
  fromTeamId: string;
  fromTeamName: string;
  toTeamId: string;
  toTeamName: string;
  amount: number;
  reason: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export type Admin = {
  id: string;
  eventId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
};

export type Event = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  initialTeamBalance: number;
  loanLimit: number;
};

export type RoundStatus = "REGISTRATION" | "ROUND_1_ACTIVE" | "ROUND_1_LOCKED" | "ROUND_2_ACTIVE" | "AUCTION_PHASE" | "ROUND_3_ACTIVE" | "FINALIZED";

export const ALL_ROUND_STATUSES: RoundStatus[] = [
  "REGISTRATION",
  "ROUND_1_ACTIVE",
  "ROUND_1_LOCKED",
  "ROUND_2_ACTIVE",
  "AUCTION_PHASE",
  "ROUND_3_ACTIVE",
  "FINALIZED"
];

export type GameConfig = {
  id: string;
  currentRound: number;
  roundStatus: RoundStatus;
  roundStartTime: string;
  roundEndTime: string;
  cashWeight: number;
  propertyWeight: number;
  tokenWeight: number;
  creditWeight: number;
}

export type CohortStatus = 'WAITING' | 'ROUND_2_ACTIVE' | 'ROUND_2_COMPLETED' | 'ROUND_3_AUCTION' | 'FINALIZED';

export type Cohort = {
  id: string;
  eventId: string;
  name: string;
  teamIds: string[];
  moderatorId: string;
  status: CohortStatus;
}

export type Property = {
  id: string;
  eventId: string;
  name: string;
  cohortId: string;
  baseValue: number;
  rentValue: number;
  ownerTeamId?: string | null;
  ownerTeamName?: string | null;
  status: 'UNOWNED' | 'OWNED' | 'SEIZED' | 'AUCTION';
}

export type Token = {
  id: string;
  teamId: string;
  strategyTokens: number;
  defenseTokens: number;
};

export type AuctionTokenType = 'ACADEMIC_BOOST' | 'PRIME_SABOTAGE' | 'FINANCE_BOOST' | 'SHIELD';

export type AuctionToken = {
  id: string;
  eventId: string;
  cohortId: string;
  name: string;
  description: string;
  type: AuctionTokenType;
  originalPropertyId?: string; // If converted from seizure
  winningTeamId?: string;
  winningBid?: number;
  isUsed: boolean;
}

export type Auction = {
  id: string;
  eventId: string;
  propertyId: string; // Deprecated in favor of Tokens? Or used for SEIZED properties before conversion?
  cohortId: string;
  status: 'OPEN' | 'CLOSED';
  winningTeamId?: string;
  winningBid?: number;
}

export type LeaderboardRanking = {
  teamId: string;
  teamName: string;
  score: number;
  rank: number;
}

export type Leaderboard = {
  id: string;
  eventId: string;
  cohortId?: string;
  rankings: LeaderboardRanking[];
  overallRankings?: LeaderboardRanking[];
}

export type AuditLog = {
  id: string;
  timestamp: string;
  adminId: string;
  action: string;
  details: Record<string, any>;
}
