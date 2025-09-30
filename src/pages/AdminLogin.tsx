// src/pages/AdminLogin.tsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from '@/config/firebase';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GalleryVerticalEnd } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Step 1: Securely sign in with Firebase Authentication.
      // This correctly finds the user by email and verifies their password.
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Now that the user is authenticated, check their document in Firestore.
      // We use the reliable user.uid to find their specific record.
      const userDocRef = doc(db, "Users", user.uid);
      const userDoc = await getDoc(userDocRef);

      // Step 3: Check if the user exists in Firestore and has the AdminCheck flag.
      if (userDoc.exists() && userDoc.data().AdminCheck === true) {
        // If they are an admin, navigate to the admin dashboard.
        // This creates a real session, so your protected routes will work.
        navigate('/admin');
      } else {
        // If they are not an admin, sign them out immediately and show an error.
        await auth.signOut();
        setError("Access Denied: You are not an authorized admin.");
      }
    } catch (err: any) {
      // This will catch errors from Firebase Auth (e.g., wrong password, user not found).
      setError('Invalid email or password.');
      console.error(err);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background text-foreground">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Gitzzeria
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Admin Login</CardTitle>
              <CardDescription>
                Enter your admin credentials to access the admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@gitzzeria.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                </div>
                <CardFooter className="flex flex-col gap-4 mt-6 p-0">
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/images/10-1.jpg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.4] dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
};

export default AdminLogin;