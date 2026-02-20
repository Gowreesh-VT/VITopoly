'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import React, { useEffect, useState, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

type QrScannerDialogProps = {
  onScan: (data: string | null) => void;
  children: React.ReactNode;
};

export function QrScannerDialog({ onScan, children }: QrScannerDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleDecode = (result: string) => {
    onScan(result);
    setOpen(false);
    toast({
      title: 'Scan Successful',
      description: `Scanned data identified.`,
    });
  };

  const handleError = (error: any) => {
    console.error('Scanner Error:', error);
    // Only show toast for meaningful errors
    if (error.name !== "NotFoundException" && error.name !== "NotAllowedError") {
        toast({
            variant: 'destructive',
            title: 'Scan Error',
            description: error?.message || 'Failed to scan QR code.',
        });
    }
    
    if (error.name === "NotAllowedError") {
        toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'Please allow camera access in your browser settings.',
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Center the QR code within the frame to scan it.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 overflow-hidden rounded-xl border bg-black aspect-square relative">
            <Scanner
                onScan={(result) => {
                    if (result?.[0]?.rawValue) {
                        handleDecode(result[0].rawValue);
                    }
                }}
                onError={handleError}
                allowMultiple={false}
                scanDelay={300}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
