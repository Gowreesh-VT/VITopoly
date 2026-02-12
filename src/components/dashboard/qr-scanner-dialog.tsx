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
      description: `Scanned data: ${result}`,
    });
  };

  const handleError = (error: any) => {
    console.warn("QR Scan Error:", error);
    // Ignore common non-critical errors
    if (error?.name === 'NotFoundException') return;
    
    // Handle OverconstrainedError specifically
    if (error?.name === 'OverconstrainedError') {
        toast({
            variant: 'destructive',
            title: 'Camera Error',
            description: 'Your camera does not support the requested settings. Please try a different device.',
        });
        return;
    }

    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'Please grant camera access to use the scanner.',
        });
        return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Center the QR code within the frame to scan it.
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-square w-full overflow-hidden rounded-md bg-muted relative">
            {open && (
                <Scanner
                    onScan={(result) => result?.[0]?.rawValue && handleDecode(result[0].rawValue)}
                    onError={handleError}
                    constraints={{ 
                        facingMode: 'environment',
                        aspectRatio: { min: 1, max: 1 }
                    }}
                    styles={{
                        container: { width: '100%', height: '100%' },
                        video: { width: '100%', height: '100%', objectFit: 'cover' }
                    }}
                    components={{
                        onOff: false,
                        torch: false,
                        zoom: false,
                        finder: false,
                    }}
                />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
