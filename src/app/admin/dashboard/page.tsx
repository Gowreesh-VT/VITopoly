'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Requests by default
    router.replace('/admin/dashboard/requests');
  }, [router]);

  return (
    <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
