'use client';

import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, useFirestore } from '@/firebase';
import type { GameConfig } from '@/lib/types';
import { ALL_ROUND_STATUSES } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';

const formSchema = z.object({
  currentRound: z.coerce.number().int().min(1),
  roundStatus: z.enum(ALL_ROUND_STATUSES as [string, ...string[]]),
  roundStartTime: z.date(),
  roundEndTime: z.date(),
  cashWeight: z.coerce.number().min(0).max(1),
  propertyWeight: z.coerce.number().min(0).max(1),
  tokenWeight: z.coerce.number().min(0).max(1),
  creditWeight: z.coerce.number().min(0).max(1),
}).refine(data => data.roundEndTime > data.roundStartTime, {
    message: "End date must be after start date.",
    path: ["roundEndTime"],
});

type UpdateGameStateDialogProps = {
  children: ReactNode;
  gameConfig: GameConfig;
};

export function UpdateGameStateDialog({ children, gameConfig }: UpdateGameStateDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...gameConfig,
      roundStartTime: new Date(gameConfig.roundStartTime),
      roundEndTime: new Date(gameConfig.roundEndTime),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const gameStateRef = doc(firestore, 'game_config', 'current_event');
    
    const updatedValues = {
        ...values,
        roundStartTime: values.roundStartTime.toISOString(),
        roundEndTime: values.roundEndTime.toISOString(),
    }

    updateDocumentNonBlocking(gameStateRef, updatedValues);

    toast({
      title: 'Game State Updated',
      description: 'The global game state has been successfully updated.',
    });
    
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Global Game State</DialogTitle>
          <DialogDescription>
            Modify the live game state. Changes will affect all users immediately.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 py-4">
            <FormField control={form.control} name="currentRound" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Round</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="roundStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Round Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ALL_ROUND_STATUSES.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status.replace(/_/g, ' ').toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="roundStartTime" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Round Start Time</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="roundEndTime" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Round End Time</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="cashWeight" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cash Weight</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="propertyWeight" render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Weight</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="tokenWeight" render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Weight</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField control={form.control} name="creditWeight" render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Weight</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="col-span-2">
               <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
