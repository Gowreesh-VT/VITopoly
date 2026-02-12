import type { Team, UserProfile, Transaction, PaymentRequest, Notification, Admin } from './types';
import { PlaceHolderImages } from './placeholder-images';

const avatar1 = PlaceHolderImages.find(p => p.id === 'avatar-1')?.imageUrl ?? '';
const avatar2 = PlaceHolderImages.find(p => p.id === 'avatar-2')?.imageUrl ?? '';
const avatar3 = PlaceHolderImages.find(p => p.id === 'avatar-3')?.imageUrl ?? '';
const avatar4 = PlaceHolderImages.find(p => p.id === 'avatar-4')?.imageUrl ?? '';

export const mockUsers: UserProfile[] = [];
export const mockTeams: Team[] = [];
export const mockTransactions: Transaction[] = [];
export const mockPaymentRequests: PaymentRequest[] = [];
export const mockNotifications: Notification[] = [];
export const mockLedger: Transaction[] = [];
export const mockAdmins: Admin[] = [];
