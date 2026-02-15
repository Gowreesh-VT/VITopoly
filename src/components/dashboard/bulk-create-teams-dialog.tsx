'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Upload, AlertCircle, CheckCircle, XCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useFirestore, createTeam, useUser } from '@/firebase';
import type { Event, UserProfile } from '@/lib/types';
import { doc, setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

interface BulkCreateTeamsDialogProps {
  events: Event[];
}

interface CsvTeamRow {
  teamName: string;
  email: string;
  password: string;
}

interface ImportResult {
  row: number;
  teamName: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export function BulkCreateTeamsDialog({ events }: BulkCreateTeamsDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [parsedData, setParsedData] = useState<CsvTeamRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload a valid CSV file.' });
      return;
    }

    Papa.parse<CsvTeamRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({ variant: 'destructive', title: 'Parse Error', description: 'Error parsing CSV file.' });
          console.error("CSV Parse Errors:", results.errors);
          return;
        }

        // Validate headers
        const headers = results.meta.fields;
        if (!headers || !headers.includes('teamName') || !headers.includes('email') || !headers.includes('password')) {
             toast({ 
                 variant: 'destructive', 
                 title: 'Invalid CSV Format', 
                 description: 'CSV must contain headers: teamName, email, password' 
             });
             return;
        }

        setParsedData(results.data);
        setStep('preview');
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error', description: `Failed to parse CSV: ${error.message}` });
      }
    });
  };

  const startImport = async () => {
    if (!selectedEventId || !user) {
         toast({ variant: 'destructive', title: 'Error', description: 'Please select an event.' });
         return;
    }

    const selectedEvent = events.find(e => e.id === selectedEventId);
    if (!selectedEvent) return;

    setStep('importing');
    setProgress(0);
    
    // Initialize results state
    const initialResults: ImportResult[] = parsedData.map((row, index) => ({
        row: index + 1,
        teamName: row.teamName,
        status: 'pending'
    }));
    setResults(initialResults);

    // Initialize Secondary App for Auth
    let secondaryApp;
    try {
      try {
        secondaryApp = getApp('_bulkTeamUserCreator');
      } catch {
        secondaryApp = initializeApp(firebaseConfig, '_bulkTeamUserCreator');
      }
      const secondaryAuth = getAuth(secondaryApp);

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const resultIndex = i;

        try {
            // Validate row data
            if (!row.teamName || !row.email || !row.password) {
                throw new Error("Missing required fields");
            }
            if (row.password.length < 6) {
                throw new Error("Password too short < 6 chars");
            }

            // 1. Create Team in Firestore
            const teamId = await createTeam(firestore, {
                eventId: selectedEventId,
                teamName: row.teamName,
                initialBalance: selectedEvent.initialTeamBalance,
                adminId: user.uid
            });

            // 2. Create Auth User (Secondary App)
            const credential = await createUserWithEmailAndPassword(secondaryAuth, row.email, row.password);
            const newUserId = credential.user.uid;
            await secondaryAuth.signOut(); // Important to sign out so next iteration doesn't conflict? Actually signOut is global for the Auth instance. Wait, createUserWithEmailAndPassword automatically signs in the user. Yes, we MUST sign out.
            
            // 3. Create User Profile (Main App Firestore)
            const userProfile: UserProfile = {
                id: newUserId,
                email: row.email,
                displayName: row.teamName,
                role: 'TEAM',
                teamId: teamId,
                eventId: selectedEventId,
            };
            await setDoc(doc(firestore, 'users', newUserId), userProfile);

            // Success
            setResults(prev => {
                const newResults = [...prev];
                newResults[resultIndex] = { ...newResults[resultIndex], status: 'success', message: 'Team and user created' };
                return newResults;
            });

        } catch (error: any) {
            console.error(`Error processing row ${i + 1}:`, error);
            let errorMessage = error.message || "Unknown error";
             if (error?.code === 'auth/email-already-in-use') {
                errorMessage = 'Email already in use';
             }

            setResults(prev => {
                const newResults = [...prev];
                newResults[resultIndex] = { ...newResults[resultIndex], status: 'error', message: errorMessage };
                return newResults;
            });
        }

        // Update progress
        setProgress(Math.round(((i + 1) / parsedData.length) * 100));
      }

    } catch (e: any) {
        console.error("Critical Import Error:", e);
        toast({ variant:'destructive', title: 'Critical Error', description: e.message });
    } finally {
        if (secondaryApp) {
            await deleteApp(secondaryApp).catch(() => {});
        }
        setStep('results');
    }
  };

  const reset = () => {
    setStep('upload');
    setParsedData([]);
    setResults([]);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const failureCount = results.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={(open) => {
        if (!open && step === 'importing') return; // Prevent closing while importing
        setOpen(open);
        if (!open) reset(); // Reset on close
    }}>
      <DialogTrigger asChild>
         <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Bulk Import
         </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Teams</DialogTitle>
          <DialogDescription>
            Import multiple teams from a CSV file. The CSV must have headers: <code>teamName</code>, <code>email</code>, <code>password</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
            
            {/* Event Selection */}
            {step === 'upload' && (
                <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Select Event</label>
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select event..." />
                            </SelectTrigger>
                            <SelectContent>
                                {events.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4 hover:bg-muted/50 transition-colors">
                         <div className="flex justify-center">
                            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                         </div>
                         <div>
                            <p className="text-sm text-muted-foreground mb-2">Drag and drop your CSV file here, or click to browse</p>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept=".csv" 
                                onChange={handleFileChange}
                                className="hidden" 
                                id="csv-upload"
                            />
                            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                Choose File
                            </Button>
                         </div>
                         <p className="text-xs text-muted-foreground">Max file size: 5MB</p>
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>CSV Format Required</AlertTitle>
                        <AlertDescription>
                            Your CSV file must contain exactly these headers: <strong>teamName, email, password</strong>.
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Preview Step */}
            {step === 'preview' && (
                <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Review Data ({parsedData.length} teams)</h3>
                        <Button variant="ghost" size="sm" onClick={reset}>Cancel</Button>
                     </div>
                     <ScrollArea className="h-[300px] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Row</TableHead>
                                    <TableHead>Team Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Password</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedData.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{i + 1}</TableCell>
                                        <TableCell className={!row.teamName ? "text-destructive" : ""}>{row.teamName || "MISSING"}</TableCell>
                                        <TableCell className={!row.email ? "text-destructive" : ""}>{row.email || "MISSING"}</TableCell>
                                        <TableCell className={row.password?.length < 6 ? "text-destructive" : ""}>
                                            {row.password ? "••••••" : "MISSING"}
                                            {row.password?.length < 6 && <span className="text-xs ml-2">(Too short)</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </ScrollArea>
                </div>
            )}

            {/* Importing Progress */}
            {step === 'importing' && (
                <div className="space-y-8 py-8 text-center">
                    <div className="flex justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                    <div className="space-y-2">
                         <h3 className="text-lg font-semibold">Importing Teams...</h3>
                         <p className="text-sm text-muted-foreground">Please do not close this window.</p>
                    </div>
                    <div className="space-y-2 max-w-sm mx-auto">
                        <Progress value={progress} />
                        <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                    </div>
                </div>
            )}

            {/* Results */}
            {step === 'results' && (
                <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20 text-center">
                            <div className="flex justify-center mb-2"><CheckCircle className="h-6 w-6 text-green-500" /></div>
                            <div className="text-2xl font-bold text-green-600">{successCount}</div>
                            <div className="text-sm text-muted-foreground">Successful</div>
                        </div>
                        <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 text-center">
                            <div className="flex justify-center mb-2"><XCircle className="h-6 w-6 text-red-500" /></div>
                            <div className="text-2xl font-bold text-red-600">{failureCount}</div>
                            <div className="text-sm text-muted-foreground">Failed</div>
                        </div>
                     </div>

                     <ScrollArea className="h-[200px] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Row</TableHead>
                                    <TableHead>Team</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Message</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map((res, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{res.row}</TableCell>
                                        <TableCell>{res.teamName}</TableCell>
                                        <TableCell>
                                            {res.status === 'success' && <span className="text-green-600 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Success</span>}
                                            {res.status === 'error' && <span className="text-red-600 flex items-center"><XCircle className="w-3 h-3 mr-1"/> Error</span>}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{res.message}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </ScrollArea>
                </div>
            )}
        </div>

        <DialogFooter>
             {step === 'preview' && (
                 <Button onClick={startImport} disabled={!selectedEventId}>
                    Start Import
                 </Button>
             )}
             {step === 'results' && (
                 <Button onClick={() => setOpen(false)}>Done</Button>
             )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
