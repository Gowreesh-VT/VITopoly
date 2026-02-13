'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

import { useSuperAdminData } from './_hooks/use-super-admin-data';
import { exportLedgerCsv } from './_lib/export-ledger';
import { DashboardSkeleton } from './_components/dashboard-skeleton';
import { OverviewTab } from './_components/overview-tab';
import { EventsTab } from './_components/events-tab';
import { TeamsTab } from './_components/teams-tab';
import { AdminsTab } from './_components/admins-tab';
import { CohortsTab } from './_components/cohorts-tab';
import { PropertiesTab } from './_components/properties-tab';
import { LeaderboardTab } from './_components/leaderboard-tab';
import { LedgerTab } from './_components/ledger-tab';

const VALID_TABS = ['overview', 'events', 'teams', 'admins', 'cohorts', 'properties', 'leaderboard', 'ledger'] as const;

export default function SuperAdminDashboardPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isClient, setIsClient] = useState(false);

  const {
    user,
    firestore,
    gameConfig,
    events,
    teams,
    users,
    admins,
    ledger,
    loans,
    cohorts,
    properties,
    leaderboards,
    isLoading,
    totalVCash,
    totalActiveLoans,
    averageCreditScore,
  } = useSuperAdminData();

  useEffect(() => {
    setIsClient(true);

    const syncHash = () => {
      const hash = window.location.hash.replace('#', '');
      if ((VALID_TABS as readonly string[]).includes(hash)) {
        setActiveTab(hash);
      }
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const handleExport = () => {
    if (ledger.length === 0) {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'No ledger data available to export.' });
      return;
    }
    exportLedgerCsv(ledger);
  };

  if (isLoading || !isClient || !user) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">System Dashboard</h1>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Ledger (CSV)
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            firestore={firestore}
            gameConfig={gameConfig}
            teams={teams}
            admins={admins}
            ledger={ledger}
            totalVCash={totalVCash}
            totalActiveLoans={totalActiveLoans}
            averageCreditScore={averageCreditScore}
          />
        </TabsContent>

        <TabsContent value="events">
          <EventsTab events={events} />
        </TabsContent>

        <TabsContent value="teams">
          <TeamsTab firestore={firestore} userId={user!.uid} teams={teams} events={events} loans={loans} />
        </TabsContent>

        <TabsContent value="admins">
          <AdminsTab firestore={firestore} events={events} users={users} />
        </TabsContent>

        <TabsContent value="cohorts">
          <CohortsTab cohorts={cohorts} events={events} admins={admins} teams={teams} users={users} />
        </TabsContent>

        <TabsContent value="properties">
          <PropertiesTab properties={properties} events={events} cohorts={cohorts} teams={teams} />
        </TabsContent>

        <TabsContent value="leaderboard">
          <LeaderboardTab leaderboards={leaderboards} cohorts={cohorts} teams={teams} />
        </TabsContent>

        <TabsContent value="ledger">
          <LedgerTab ledger={ledger} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
