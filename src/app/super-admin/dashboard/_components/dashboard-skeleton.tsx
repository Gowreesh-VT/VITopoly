import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-1/4" />
              <Skeleton className="h-4 w-2/5" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
