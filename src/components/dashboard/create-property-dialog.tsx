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
import { setDocumentNonBlocking, useFirestore } from '@/firebase';
import type { Cohort, Property } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(3, "Property name must be at least 3 characters."),
  cohortId: z.string().min(1, "You must select a cohort."),
  baseValue: z.coerce.number().positive("Base value must be positive."),
  rentValue: z.coerce.number().positive("Rent value must be positive."),
});

type CreatePropertyDialogProps = {
  children: ReactNode;
  cohorts: Cohort[];
};

export function CreatePropertyDialog({ children, cohorts }: CreatePropertyDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      cohortId: '',
      baseValue: 1000,
      rentValue: 100,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const propertiesRef = collection(firestore, 'properties');
    const newPropertyRef = doc(propertiesRef);
    const selectedCohort = cohorts.find(c => c.id === values.cohortId);

    if (!selectedCohort) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected cohort not found.' });
        return;
    }

    const newProperty: Property = {
        id: newPropertyRef.id,
        name: values.name,
        cohortId: values.cohortId,
        baseValue: values.baseValue,
        rentValue: values.rentValue,
        status: 'UNOWNED',
        eventId: selectedCohort.eventId,
        ownerTeamId: null,
        ownerTeamName: null,
    }
    
    setDocumentNonBlocking(newPropertyRef, newProperty, {});

    toast({
      title: 'Property Created',
      description: `Successfully created the property "${values.name}".`,
    });
    
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Property</DialogTitle>
          <DialogDescription>
            Create a new virtual property and assign it to a cohort.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tech Park" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cohortId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cohort</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to a cohort" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cohorts.map(cohort => (
                        <SelectItem key={cohort.id} value={cohort.id}>
                          {cohort.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="baseValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Value (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rentValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rent Value (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Create Property</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
