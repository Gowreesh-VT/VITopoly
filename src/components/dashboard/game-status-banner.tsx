'use client';

import { useGameConfig } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle, Hourglass } from 'lucide-react';
import { useState, useEffect } from 'react';


export function GameStatusBanner() {
    const { gameConfig, isGameConfigLoading } = useGameConfig();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (isGameConfigLoading || !isClient) {
        return (
            <div className="p-4">
                <Skeleton className="h-14 w-full" />
            </div>
        )
    }

    if (!gameConfig) {
        return null; // Don't show the banner if the game state isn't initialized
    }
    
    const getStatusVariant = (status: string) => {
        if (status.includes('ACTIVE')) return 'default';
        if (status.includes('LOCKED')) return 'destructive';
        return 'secondary';
    }
    
    const roundEndTime = new Date(gameConfig.roundEndTime);
    const hasRoundEnded = new Date() > roundEndTime;

    return (
        <div className="px-4 pt-4">
            <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-4">
                    <span>Global Game State</span>
                    <Badge variant={getStatusVariant(gameConfig.roundStatus)}>
                        {gameConfig.roundStatus.replace(/_/g, ' ')}
                    </Badge>
                </AlertTitle>
                <AlertDescription className="flex items-center justify-between mt-2">
                    <div className="text-sm">
                        <span className="font-semibold">Current Round:</span> {gameConfig.currentRound}
                    </div>
                     <div className="flex items-center gap-2 text-sm">
                        {hasRoundEnded ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Hourglass className="h-4 w-4 text-orange-500" />}
                        <span className="font-semibold">
                            {hasRoundEnded ? 'Round Ended:' : 'Round Ends:'}
                        </span> 
                        {formatDistanceToNow(roundEndTime, { addSuffix: true })}
                        <span className="text-xs text-muted-foreground">({format(roundEndTime, 'PPpp')})</span>
                     </div>
                </AlertDescription>
            </Alert>
        </div>
    );
}
