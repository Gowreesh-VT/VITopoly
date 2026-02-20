import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Property } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Building2, Utensils, GraduationCap, Home, BedDouble, HelpCircle, Mic, Presentation } from 'lucide-react';
import { BASE_PROPERTIES } from '@/lib/game-constants';

interface PropertyCardProps {
    property: Property;
    highlightOwned?: boolean;
}

export function PropertyCard({ property, highlightOwned }: PropertyCardProps) {
    // Infer Group from BASE_PROPERTIES or name if possible, or fallback
    // Since Property type doesn't have 'group', we look it up in constants
    const baseProp = BASE_PROPERTIES.find(p => p.name === property.name);
    const group = baseProp?.group || 'Unknown';

    const getGroupColor = (groupName: string) => {
        switch (groupName) {
            case 'Start': return 'bg-slate-500 text-white';
            case 'Academic Blocks': return 'bg-blue-600 text-white';
            case 'Food Street': return 'bg-red-500 text-white';
            case 'Hostel': return 'bg-purple-600 text-white';
            case 'Amphitheatre': return 'bg-orange-500 text-white';
            case 'Auditorium': return 'bg-emerald-600 text-white';
            default: return 'bg-gray-400 text-white';
        }
    };

    const getGroupIcon = (groupName: string) => {
        switch (groupName) {
            case 'Start': return <Home className="h-4 w-4" />;
            case 'Academic Blocks': return <Building2 className="h-4 w-4" />;
            case 'Food Street': return <Utensils className="h-4 w-4" />;
            case 'Hostel': return <BedDouble className="h-4 w-4" />;
            case 'Amphitheatre': return <Mic className="h-4 w-4" />;
            case 'Auditorium': return <Presentation className="h-4 w-4" />;
            default: return <HelpCircle className="h-4 w-4" />;
        }
    };

    const isOwned = property.status === 'OWNED';
    const isSeized = property.status === 'SEIZED';
    const isAuction = property.status === 'AUCTION';

    return (
        <Card className={`overflow-hidden transition-all hover:shadow-md ${highlightOwned ? 'ring-2 ring-primary' : ''}`}>
            <div className={`px-4 py-2 flex items-center justify-between ${getGroupColor(group)}`}>
                <div className="flex items-center gap-2 font-semibold">
                    {getGroupIcon(group)}
                    <span>{group}</span>
                </div>
                {/* Status Badge on Header? Maybe better in body */}
            </div>
            
            <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg leading-tight">{property.name}</CardTitle>
                <div className="flex justify-between items-center mt-1">
                    <Badge variant={isOwned ? "outline" : isSeized ? "destructive" : "secondary"}>
                        {isOwned ? "Owned" : isSeized ? "Seized" : "For Sale"}
                    </Badge>
                    {isOwned && (!property.upgradeLevel || property.upgradeLevel === 'NONE') && <Badge className="ml-2" variant="outline"><Home className="w-3 h-3 mr-1" /> Site Only</Badge>}
                    {property.upgradeLevel === 'HOUSE' && <Badge className="ml-2 bg-blue-500 hover:bg-blue-600"><Home className="w-3 h-3 mr-1" /> House</Badge>}
                    {property.upgradeLevel === 'HOTEL' && <Badge className="ml-2 bg-red-500 hover:bg-red-600"><Building2 className="w-3 h-3 mr-1" /> Hotel</Badge>}
                     {!isOwned && !isSeized && <span className="font-bold text-green-600">{formatCurrency(property.baseValue)}</span>}
                </div>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
                
                {isOwned && (
                     <div className="bg-muted p-2 rounded-md text-center">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Owner</span>
                        <div className="font-bold truncate">{property.ownerTeamName || 'Unknown'}</div>
                     </div>
                )}

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs border-b pb-2">
                     <div className="col-span-2 font-semibold text-muted-foreground mb-1">Cost</div>
                     <div className="text-muted-foreground">Property Cost</div>
                     <div className="text-right">{formatCurrency(property.baseValue)}</div>
                     
                     {baseProp?.houseValue && (
                        <>
                        <div className="text-muted-foreground">House Cost</div>
                        <div className="text-right">{formatCurrency(baseProp.houseValue)}</div>
                        </>
                     )}

                     {baseProp?.hotelValue && (
                        <>
                        <div className="text-muted-foreground">Hotel Cost</div>
                        <div className="text-right">{formatCurrency(baseProp.hotelValue)}</div>
                        </>
                     )}
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                     <div className="col-span-2 font-semibold text-muted-foreground mb-1">Rent</div>
                     <div className="text-muted-foreground">Site Rent</div>
                     <div className="text-right font-medium">{formatCurrency(property.rentValue)}</div>
                     
                     {baseProp?.houseRent && (
                        <>
                        <div className="text-muted-foreground">With House</div>
                        <div className="text-right">{formatCurrency(baseProp.houseRent)}</div>
                        </>
                     )}
                     
                     {baseProp?.hotelRent && (
                        <>
                         <div className="text-muted-foreground">With Hotel</div>
                         <div className="text-right">{formatCurrency(baseProp.hotelRent)}</div>
                        </>
                     )}
                </div>

                {isSeized && <div className="text-center text-destructive font-bold text-xs mt-2">ASSETS FROZEN</div>}
            </CardContent>
        </Card>
    );
}
