'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/lib/types';

interface LedgerTabProps {
  ledger: Transaction[];
}

export function LedgerTab({ ledger }: LedgerTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Full Transaction Ledger</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TXN ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-mono text-xs">{tx.id.substring(0, 8)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {tx.type.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{tx.reason}</div>
                  <div className="text-sm text-muted-foreground">
                    {tx.fromTeamName ?? 'SYS'} → {tx.toTeamName ?? 'SYS'}
                  </div>
                </TableCell>
                <TableCell>{format(new Date(tx.timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                <TableCell className="text-right font-medium">₹{tx.amount.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
