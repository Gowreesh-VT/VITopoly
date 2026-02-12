'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import type { Team } from '@/lib/types';
import { QrCode as QrCodeIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type TeamQrDialogProps = {
  team: Team;
};

export function TeamQrDialog({ team }: TeamQrDialogProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (team.id) {
      QRCode.toDataURL(team.id, { errorCorrectionLevel: 'H', width: 300 }, (err, url) => {
        if (err) {
          console.error(err);
          return;
        }
        setQrCodeUrl(url);
      });
    }
  }, [team.id]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <QrCodeIcon className="mr-2 h-4 w-4" />
          Show QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{team.name} QR Code</DialogTitle>
          <DialogDescription>
            Use this code for all in-game transactions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          {qrCodeUrl ? (
            <Image
              src={qrCodeUrl}
              alt={`QR code for ${team.name}`}
              width={300}
              height={300}
              className="rounded-lg"
            />
          ) : (
             <div className="h-[300px] w-[300px] bg-gray-200 animate-pulse rounded-lg" />
          )}
          <div className="text-center">
            <p className="font-semibold">{team.name}</p>
            <p className="text-sm text-muted-foreground">Team ID: {team.id}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
