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
import { assignPropertyOwner, useFirestore, useUser } from '@/firebase';
import type { Property, Team } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Landmark } from 'lucide-react';

const formSchema = z.object({
  newOwnerTeamId: z.string().nullable(),
});

type AssignPropertyOwnerDialogProps = {
  children: ReactNode;
  property: Property;
  teams: Team[];
};

export function AssignPropertyOwnerDialog({ children, property, teams }: AssignPropertyOwnerDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const teamsInCohort = teams.filter(t => t.cohortId === property.cohortId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newOwnerTeamId: property.ownerTeamId,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    try {
        await assignPropertyOwner(firestore, {
            eventId: property.eventId,
            propertyId: property.id,
            newOwnerTeamId: values.newOwnerTeamId,
            adminId: user.uid,
        });

        toast({
            title: 'Property Owner Updated',
            description: `Ownership of ${property.name} has been updated.`,
        });
        
        setOpen(false);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Owner for: {property.name}</DialogTitle>
          <DialogDescription>
            Assign this property to a team or set it as unowned.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <Alert>
                <Landmark className="h-4 w-4" />
                <AlertTitle>Property Value</AlertTitle>
                <AlertDescription>
                    Assigning a new owner will deduct the property's base value of <span className="font-semibold">${property.baseValue.toLocaleString()}</span> from their balance.
                </AlertDescription>
            </Alert>
            <FormField
              control={form.control}
              name="newOwnerTeamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(val === 'UNOWNED' ? null : val)} 
                    defaultValue={field.value ?? 'UNOWNED'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an owner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UNOWNED">-- UNOWNED --</SelectItem>
                      {teamsInCohort.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} (Balance: ${team.balance.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Updating...' : 'Update Owner'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
