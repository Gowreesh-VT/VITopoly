'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useAuth, useFirebase, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export default function LoginPage() {
  const auth = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Please enter both email and password.",
      });
      return;
    }
    initiateEmailSignIn(auth, email, password);
  };

  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      const getUserProfileAndRedirect = async () => {
        if (!user) return;
        const userProfileRef = doc(firestore, 'users', user.uid);
        try {
          const userProfileSnap = await getDoc(userProfileRef);
          if (userProfileSnap.exists()) {
            const userProfile = userProfileSnap.data() as UserProfile;
            switch (userProfile.role) {
              case 'SUPER_ADMIN':
                router.push('/super-admin/dashboard');
                break;
              case 'ADMIN':
                router.push('/admin/dashboard');
                break;
              case 'TEAM':
                // A team user might not be assigned to a team yet.
                // The team dashboard will correctly handle this empty state.
                router.push('/team/dashboard');
                break;
              default:
                router.push('/team/dashboard'); // Default redirect
            }
          } else {
            // User profile doesn't exist, so we create it.
            console.log("User profile not found in Firestore. Creating a new one.");
            const newUserProfile: Omit<UserProfile, 'teamId' | 'eventId'> = {
                id: user.uid,
                email: user.email ?? '',
                displayName: user.displayName || (user.email?.split('@')[0] ?? 'New User'),
                role: 'TEAM',
            };
            await setDoc(userProfileRef, newUserProfile);
            toast({
                title: "Welcome!",
                description: "Your user profile has been created. An admin will assign you to a team.",
            });
            // Redirect new users to the team dashboard, which will show an empty/pending state.
            router.push('/team/dashboard');
          }
        } catch (error) {
          console.error("Error fetching or creating user profile:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not access your user profile. Please try again.",
          });
          router.push('/login');
        }
      };

      getUserProfileAndRedirect();
    }
  }, [user, isUserLoading, router, firestore, toast]);

  if (isUserLoading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center">
          <Logo />
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="m@example.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleLogin}>
            Sign in
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
