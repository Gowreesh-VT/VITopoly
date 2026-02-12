import type { Transaction } from '@/lib/types';

export function exportLedgerCsv(ledger: Transaction[]) {
  const header = [
    'id',
    'eventId',
    'timestamp',
    'type',
    'fromTeamId',
    'fromTeamName',
    'toTeamId',
    'toTeamName',
    'adminId',
    'amount',
    'reason',
    'balanceAfterTransaction',
  ];

  const csvRows = [
    header.join(','),
    ...ledger.map((tx) =>
      [
        tx.id,
        tx.eventId,
        tx.timestamp,
        tx.type,
        tx.fromTeamId ?? '',
        `"${tx.fromTeamName?.replace(/"/g, '""') ?? ''}"`,
        tx.toTeamId ?? '',
        `"${tx.toTeamName?.replace(/"/g, '""') ?? ''}"`,
        tx.adminId ?? '',
        tx.amount,
        `"${tx.reason.replace(/"/g, '""')}"`,
        tx.balanceAfterTransaction ?? '',
      ].join(','),
    ),
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `vcash-ledger-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
