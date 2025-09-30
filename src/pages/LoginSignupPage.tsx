import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, setDoc } from "firebase/firestore";
// FIX: Combined all auth imports into a single, correct line
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { db, auth } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GalleryVerticalEnd, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LoginSignupPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      navigate('/menu');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setLoginError('Invalid email or password.');
      } else {
        setLoginError(error.message || 'Login Failed');
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    if (signupName && signupEmail && signupPassword) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
        const user = userCredential.user;
        
        await sendEmailVerification(user);

        await setDoc(doc(db, "Users", user.uid), {
          Name: signupName,
          UserID: user.uid,
          AdminCheck: false,
        });

        toast.info("Verification email sent!", {
            description: "Please check your inbox to verify your account."
        });
        
        navigate('/auth');
        setActiveTab('login');

      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          setSignupError('This email is already in use.');
        } else {
          setSignupError(error.message || "Error creating account");
        }
      }
    } else {
      setSignupError("Please fill in all fields");
    }
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
        toast.error("Please enter your email address.");
        return;
    }
    setIsResetting(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast.success("Password reset email sent!", {
            description: "Please check your inbox for a link to reset your password.",
        });
        setIsResetDialogOpen(false);
        setResetEmail('');
    } catch (error: any) {
        toast.error("Failed to send reset email.", {
            description: error.message.includes('auth/user-not-found') 
                ? "No user found with this email address." 
                : "An error occurred. Please try again.",
        });
    } finally {
        setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-4">
      <div className="flex justify-start items-center gap-2 mb-8">
        <Link to="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-4" />
            </div>
            Gitzzeria
        </Link>
      </div>
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Login / Sign Up</CardTitle>
            <CardDescription> Your ultimate canteen management solution. </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="grid gap-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="m@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="login-password">Password</Label>
                        <Button variant="link" type="button" className="ml-auto px-0 text-sm h-auto" onClick={() => setIsResetDialogOpen(true)}>
                            Forgot your password?
                        </Button>
                    </div>
                    <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required autoComplete="current-password" />
                  </div>
                  {loginError && <p className="text-sm text-destructive mt-2">{loginError}</p>}
                  <Button type="submit" className="w-full">Login</Button>
                  <div className="text-center text-sm mt-4">
                    Don't have an account?{" "}
                    <button type="button" onClick={() => setActiveTab('signup')} className="underline underline-offset-4 text-primary">
                      Sign up
                    </button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="grid gap-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="signup-name">Name</Label>
                    <Input id="signup-name" type="text" placeholder="John Doe" value={signupName} onChange={(e) => setSignupName(e.target.value)} required autoComplete="name" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="m@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required autoComplete="new-password" />
                  </div>
                  {signupError && <p className="text-sm text-destructive mt-2">{signupError}</p>}
                  <Button type="submit" className="w-full"> Create account </Button>
                  <div className="text-center text-sm mt-4">
                    Already have an account?{" "}
                    <button type="button" onClick={() => setActiveTab('login')} className="underline underline-offset-4 text-primary">
                      Login
                    </button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>

            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter your email address below. We'll send you a link to reset your password.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordReset}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="reset-email" className="text-right">Email</Label>
                                <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="col-span-3" required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isResetting}>
                                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Reset Link
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginSignupPage;