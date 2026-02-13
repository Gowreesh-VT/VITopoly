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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
    getLandOnPropertyStatus, 
    executePropertyPurchase, 
    executeRentPayment, 
    executePassGo,
    LandOnPropertyResult 
} from '@/lib/game-logic';
import type { Cohort, Team, Property, Transaction } from '@/lib/types';
import { Loader2, DollarSign, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input'; // For manual adjust maybe?
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DefaultTeamDialog } from './default-team-dialog';

export function ModeratorGameConsole() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // Data State
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [selectedCohortId, setSelectedCohortId] = useState<string>('');
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
        const fetchCohorts = async () => {
            // Fetch all for now. Ideally filter by eventId.
            const q = query(collection(firestore, 'cohorts')); 
            const snap = await getDocs(q);
            setCohorts(snap.docs.map(d => d.data() as Cohort));
        };
        fetchCohorts();
    }, [firestore]);

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
        if (!user || !selectedTeamId || !selectedPropertyId) return;
        setActionState('PROCESSING');
        try {
            await executePropertyPurchase(firestore, selectedTeamId, selectedPropertyId, user.uid);
            toast({ title: 'Success', description: 'Property purchased!' });
            resetAction();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Buy Failed', description: error.message });
            setActionState('DECISION'); // Go back to decision
        }
    };

    const handleConfirmRent = async () => {
        if (!user || !selectedTeamId || !selectedPropertyId) return;
        setActionState('PROCESSING');
        try {
            await executeRentPayment(firestore, selectedTeamId, selectedPropertyId, user.uid);
            toast({ title: 'Success', description: 'Rent paid successfully.' });
            resetAction();
        } catch (error: any) {
            if (error.message === 'INSUFFICIENT_FUNDS') {
                 toast({ variant: 'destructive', title: 'Default Warning', description: 'Team has insufficient funds!' });
                 // Here we could trigger a specific UI for Default
            } else {
                 toast({ variant: 'destructive', title: 'Rent Failed', description: error.message });
            }
            setActionState('DECISION');
        }
    };

    const handlePassGo = async () => {
        if (!user || !selectedTeamId) return;
        if (!confirm('Confirm Pass Go (+$2000)?')) return;
        try {
            await executePassGo(firestore, selectedTeamId, user.uid);
            toast({ title: 'Success', description: 'Salary added.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed', description: error.message });
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
                        {selectedCohortId && selectedTeamId && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
                                <span className="text-sm font-medium text-muted-foreground">Active Team:</span>
                                <span className="font-bold">{selectedTeam?.name}</span>
                                <Badge variant={selectedTeam?.balance && selectedTeam.balance < 0 ? 'destructive' : 'default'}>
                                    ${selectedTeam?.balance.toLocaleString() ?? 0}
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
                                            <span className={team.balance < 0 ? 'text-red-500' : ''}>${team.balance.toLocaleString()}</span>
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
                                                                <DollarSign className="w-5 h-5" />
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
                                                                <DollarSign className="w-5 h-5" />
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
                                                            <p>You own this property.</p>
                                                            <Button variant="outline" className="mt-2" onClick={resetAction}>Close</Button>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}

                                        <Separator className="my-4" />
                                        
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button variant="secondary" onClick={handlePassGo}>
                                                    <DollarSign className="w-4 h-4 mr-2" /> Pass Go
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
