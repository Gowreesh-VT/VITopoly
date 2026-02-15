'use client';

import { useState, useEffect } from 'react';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    onSnapshot,
    orderBy,
    limit 
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
    getLandOnPropertyStatus, 
    executePropertyPurchase, 
    executeRentPayment, 
    executePassGo,
    executePropertyUpgrade,
    LandOnPropertyResult 
} from '@/lib/game-logic';
import { executeJailFine } from '@/lib/game-logic';
import { GAME_CONFIG } from '@/lib/game-constants';
import type { Cohort, Team, Property, Transaction } from '@/lib/types';
import { Loader2, IndianRupee, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input'; // For manual adjust maybe?
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DefaultTeamDialog } from './default-team-dialog';

export type ModeratorGameConsoleProps = {
    initialCohort?: Cohort;
}

export function ModeratorGameConsole({ initialCohort }: ModeratorGameConsoleProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // Data State
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [selectedCohortId, setSelectedCohortId] = useState<string>(initialCohort?.id || '');
    const [teams, setTeams] = useState<Team[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    
    // UI State
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [actionState, setActionState] = useState<'IDLE' | 'CHECKING' | 'DECISION' | 'PROCESSING'>('IDLE');
    const [decisionResult, setDecisionResult] = useState<LandOnPropertyResult | null>(null);
    const [recentLogs, setRecentLogs] = useState<Transaction[]>([]);

    // 1. Fetch Cohorts on Load
    useEffect(() => {
        if (initialCohort) {
            setCohorts([initialCohort]);
            setSelectedCohortId(initialCohort.id);
            return;
        }

        const fetchCohorts = async () => {
            // Fetch all for now. Ideally filter by eventId.
            const q = query(collection(firestore, 'cohorts')); 
            const snap = await getDocs(q);
            setCohorts(snap.docs.map(d => d.data() as Cohort));
        };
        fetchCohorts();
    }, [firestore, initialCohort]);

    // 2. Subscribe to Cohort Data (Teams, Properties)
    useEffect(() => {
        if (!selectedCohortId) return;

        // Find the selected cohort to get the eventId
        const activeCohort = cohorts.find(c => c.id === selectedCohortId);
        if (!activeCohort) return;

        console.log("ModeratorConsole: Subscribing to cohort", activeCohort.name, "Event:", activeCohort.eventId);

        // Fetch Teams from events/{eventId}/teams
        // Correct path for non-super-admins
        const teamsRef = collection(firestore, 'events', activeCohort.eventId, 'teams');
        const teamsQ = query(teamsRef, where('cohortId', '==', selectedCohortId));
        
        const unsubscribeTeams = onSnapshot(teamsQ, (snap) => {
            console.log("ModeratorConsole: Teams loaded", snap.docs.length);
            setTeams(snap.docs.map(d => d.data() as Team));
        }, (err) => {
            console.error("ModeratorConsole: Teams Error", err);
            toast({ variant: 'destructive', title: 'Error Loading Teams', description: err.message });
        });

        // Fetch Properties (Root collection, so this should work if rules allow)
        // If properties are indeed root, this is fine.
        const propsQ = query(collection(firestore, 'properties'), where('cohortId', '==', selectedCohortId));
        const unsubscribeProps = onSnapshot(propsQ, (snap) => {
             setProperties(snap.docs.map(d => d.data() as Property));
        }, (err) => {
             console.error("ModeratorConsole: Properties Error", err);
        });
        
        return () => {
            unsubscribeTeams();
            unsubscribeProps();
        };
    }, [firestore, selectedCohortId, cohorts, toast]);

    // Actions
    const handleCheckProperty = async () => {
        if (!selectedTeamId || !selectedPropertyId) return;
        setActionState('CHECKING');
        try {
            const result = await getLandOnPropertyStatus(firestore, selectedPropertyId, selectedTeamId);
            setDecisionResult(result);
            setActionState('DECISION');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setActionState('IDLE');
        }
    };

    const handleConfirmBuy = async () => {
        if (!selectedTeam || !selectedPropertyId || !user) return;
        
        try {
            setActionState('PROCESSING');
            await executePropertyPurchase(firestore, selectedTeam.id, selectedPropertyId, user.uid, selectedTeam.eventId);
            toast({ title: 'Success', description: `Purchased!` });
            
            // Refund state
            setSelectedTeamId('');
            setSelectedPropertyId('');
            setDecisionResult(null);
            setActionState('IDLE');
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Buy Failed', description: e.message, variant: 'destructive' });
            setActionState('IDLE'); // Reset on failure too
        }
    };

    const handleConfirmRent = async () => {
         if (!selectedTeam || !selectedPropertyId || !user) return;
         try {
            setActionState('PROCESSING');
            await executeRentPayment(firestore, selectedTeam.id, selectedPropertyId, user.uid, selectedTeam.eventId);
            toast({ title: 'Success', description: `Rent Paid!` });
             
            // Refund state
            setSelectedTeamId('');
            setSelectedPropertyId('');
            setDecisionResult(null);
             setActionState('IDLE');
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Rent Payment Failed', description: e.message, variant: 'destructive' });
             setActionState('IDLE');
        }
    };

    const handleConfirmUpgrade = async (targetLevel: 'HOUSE' | 'HOTEL') => {
         if (!selectedTeam || !selectedPropertyId || !user) return;
         try {
            setActionState('PROCESSING');
            await executePropertyUpgrade(firestore, selectedTeam.id, selectedPropertyId, targetLevel, user.uid, selectedTeam.eventId);
            toast({ title: 'Success', description: `Upgraded to ${targetLevel}!` });
             
            // Refund state
            setSelectedTeamId('');
            setSelectedPropertyId('');
            setDecisionResult(null);
             setActionState('IDLE');
        } catch (e: any) {
            console.error(e);
            toast({ title: 'Upgrade Failed', description: e.message, variant: 'destructive' });
             setActionState('IDLE');
        }
    };

    const handlePassGo = async () => {
        if (!selectedTeam || !user) return;
        try {
             await executePassGo(firestore, selectedTeamId, user.uid, selectedTeam.eventId);
             toast({ title: 'Success', description: 'Salary Paid!' });
        } catch (e: any) {
             console.error(e);
             toast({ title: 'Error', description: e.message, variant: 'destructive' });
        }
    };

    const handleJailFine = async () => {
        if (!selectedTeam || !user) return;
        try {
             await executeJailFine(firestore, selectedTeamId, user.uid, selectedTeam.eventId);
             toast({ title: 'Success', description: 'Jail Fine Paid!' });
        } catch (e: any) {
             console.error(e);
             toast({ title: 'Error', description: e.message, variant: 'destructive' });
        }
    };

    const resetAction = () => {
        setActionState('IDLE');
        setDecisionResult(null);
        setSelectedPropertyId('');
    };

    const selectedTeam = teams.find(t => t.id === selectedTeamId);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Moderator Console</CardTitle>
                    <CardDescription>Manage Round 2 Gameplay</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-center mb-6">
                        {initialCohort ? (
                             <Badge variant="outline" className="text-lg px-4 py-1">
                                Cohort: {initialCohort.name}
                             </Badge>
                        ) : (
                            <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select Cohort" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cohorts.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {selectedCohortId && selectedTeamId && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
                                <span className="text-sm font-medium text-muted-foreground">Active Team:</span>
                                <span className="font-bold">{selectedTeam?.name}</span>
                                <Badge variant={selectedTeam?.balance && selectedTeam.balance < 0 ? 'destructive' : 'default'}>
                                    {GAME_CONFIG.CURRENCY_SYMBOL}{selectedTeam?.balance.toLocaleString() ?? 0}
                                </Badge>
                            </div>
                        )}
                    </div>

                    {!selectedCohortId ? (
                        <div className="text-center py-10 text-muted-foreground">Please select a cohort to begin.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left: Action Log / Team Selector */}
                            <div className="space-y-4">
                                <h3 className="font-medium">1. Select Player</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {teams.map(team => (
                                        <Button 
                                            key={team.id} 
                                            variant={selectedTeamId === team.id ? 'default' : 'outline'}
                                            className="justify-between h-auto py-3"
                                            onClick={() => { setSelectedTeamId(team.id); resetAction(); }}
                                        >
                                            <span className="font-semibold">{team.name}</span>
                                            <span className={team.balance < 0 ? 'text-red-500' : ''}>{GAME_CONFIG.CURRENCY_SYMBOL}{team.balance.toLocaleString()}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Action Panel */}
                            <div className="space-y-4 border-l pl-6">
                                <h3 className="font-medium">2. Execute Action</h3>
                                {selectedTeamId ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Landed on..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {properties.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name} {p.status === 'OWNED' ? '(Owned)' : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button onClick={handleCheckProperty} disabled={!selectedPropertyId || actionState !== 'IDLE'}>
                                                {actionState === 'CHECKING' ? <Loader2 className="animate-spin" /> : 'Check'}
                                            </Button>
                                        </div>

                                        {actionState === 'DECISION' && decisionResult && (
                                            <Card className="bg-slate-50 border-2 border-primary/20">
                                                <CardContent className="pt-6 space-y-4">
                                                    {decisionResult.status === 'UNOWNED' && (
                                                        <>
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold">{decisionResult.property.name}</span>
                                                                <Badge>For Sale</Badge>
                                                            </div>
                                                            <div className="text-2xl font-bold flex items-center gap-2">
                                                                <IndianRupee className="w-5 h-5" />
                                                                {decisionResult.property.baseValue.toLocaleString()}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleConfirmBuy}>
                                                                    Confirm Buy
                                                                </Button>
                                                                <Button variant="outline" className="w-full" onClick={resetAction}>Pass</Button>
                                                            </div>
                                                        </>
                                                    )}

                                                    {decisionResult.status === 'OWNED_BY_OTHER' && (
                                                         <>
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold">{decisionResult.property.name}</span>
                                                                <Badge variant="destructive">Owned by {decisionResult.ownerName}</Badge>
                                                            </div>
                                                            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
                                                                <IndianRupee className="w-5 h-5" />
                                                                {decisionResult.rentAmount.toLocaleString()} Rent
                                                            </div>
                                                            <Button className="w-full" onClick={handleConfirmRent}>
                                                                Pay Rent
                                                            </Button>
                                                         </>
                                                    )}
                                                    
                                                    {decisionResult.status === 'OWNED_BY_SELF' && (
                                                        <div className="text-center py-4">
                                                            <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                                                            <p className="font-semibold mb-2">You own this property.</p>
                                                            
                                                            <div className="flex flex-col gap-2 mt-4">
                                                                {(!decisionResult.property.upgradeLevel || decisionResult.property.upgradeLevel === 'NONE') && decisionResult.property.houseValue && (
                                                                    <Button 
                                                                        onClick={() => handleConfirmUpgrade('HOUSE')}
                                                                        disabled={selectedTeam!.balance < (decisionResult.property.houseValue || 0)}
                                                                        className="w-full"
                                                                    >
                                                                        Build House ({GAME_CONFIG.CURRENCY_SYMBOL}{decisionResult.property.houseValue.toLocaleString()})
                                                                    </Button>
                                                                )}

                                                                {decisionResult.property.upgradeLevel === 'HOUSE' && decisionResult.property.hotelValue && (
                                                                     <Button 
                                                                        onClick={() => handleConfirmUpgrade('HOTEL')}
                                                                        disabled={selectedTeam!.balance < (decisionResult.property.hotelValue || 0)}
                                                                        className="w-full"
                                                                    >
                                                                        Build Hotel ({GAME_CONFIG.CURRENCY_SYMBOL}{decisionResult.property.hotelValue.toLocaleString()})
                                                                    </Button>
                                                                )}

                                                                {decisionResult.property.upgradeLevel === 'HOTEL' && (
                                                                    <Badge variant="outline" className="mx-auto block w-fit">Max Upgrade Reached</Badge>
                                                                )}
                                                            </div>

                                                            <Button variant="outline" className="mt-4 w-full" onClick={resetAction}>Close</Button>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}

                                        <Separator className="my-4" />
                                        
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button variant="secondary" onClick={handlePassGo}>
                                                    <IndianRupee className="w-4 h-4 mr-2" /> Pass Go (+{GAME_CONFIG.CURRENCY_SYMBOL}{GAME_CONFIG.PASS_GO_REWARD})
                                                </Button>
                                                <Button variant="secondary" onClick={handleJailFine}>
                                                    <AlertTriangle className="w-4 h-4 mr-2" /> Jail Fine (-{GAME_CONFIG.CURRENCY_SYMBOL}{GAME_CONFIG.JAIL_FINE})
                                                </Button>
                                                {selectedTeam && user && (
                                                    <DefaultTeamDialog 
                                                        team={selectedTeam} 
                                                        adminId={user.uid} 
                                                        onSuccess={resetAction}
                                                    />
                                                )}
                                            </div>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground text-sm">Select a team to perform actions.</div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
