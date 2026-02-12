'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import React, { useEffect, useState, useRef } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';

type QrScannerDialogProps = {
  onScan: (data: string | null) => void;
  children: React.ReactNode;
};

export function QrScannerDialog({ onScan, children }: QrScannerDialogProps) {
  const [open, setOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          // Stop tracks when dialog closes
          return () => {
            stream.getTracks().forEach(track => track.stop());
          };
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use the scanner.',
          });
        }
      };

      const cleanup = getCameraPermission();
      
      return () => {
        // @ts-ignore
        if (cleanup && cleanup.then) {
            // @ts-ignore
            cleanup.then(c => c && c());
        }
      };
    }
  }, [open, toast]);

  const handleDecode = (result: string) => {
    onScan(result);
    setOpen(false);
    toast({
      title: 'Scan Successful',
      description: `Scanned data: ${result}`,
    });
  };

  const handleError = (error: any) => {
    console.error(error);
    if (error.name !== "NotFoundException") { // Ignore "not found" errors which happen during scanning
        toast({
            variant: 'destructive',
            title: 'Scan Error',
            description: error?.message || 'Failed to scan QR code.',
        });
    }
  };
  
  // Conditionally render QrScanner only when permission is granted
  const renderScanner = () => {
      if (hasCameraPermission === null) {
          return <div className="w-full aspect-square bg-muted animate-pulse" />;
      }
      if (hasCameraPermission) {
          return (
             <div className="overflow-hidden rounded-md">
                 <QrScanner
                    onDecode={handleDecode}
                    onError={handleError}
                    containerStyle={{ width: '100%', paddingTop: '100%' }}
                    videoStyle={{ objectFit: 'cover' }}
                />
             </div>
          )
      }
      return (
         <Alert variant="destructive">
            <AlertTitle>Camera Access Required</AlertTitle>
            <AlertDescription>
                Please allow camera access in your browser to use the scanner.
            </AlertDescription>
         </Alert>
      )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Center the QR code within the frame to scan it.
          </DialogDescription>
        </DialogHeader>
        {renderScanner()}
      </DialogContent>
    </Dialog>
  );
}

// DialogTrigger needs to be a direct child of Dialog for it to work with asChild
const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, ...props }, ref) => {
  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  );
});
DialogTrigger.displayName = 'DialogTrigger';
