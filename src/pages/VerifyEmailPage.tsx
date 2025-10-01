import { useState, useEffect } from 'react';
import { useAuth } from '@/config/AuthContext';
import { auth } from '@/config/firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VerifyEmailPage = () => {
    const { currentUser } = useAuth();
    const [isSending, setIsSending] = useState(false);
    const navigate = useNavigate();

    // FIX: This useEffect now polls Firebase every 3 seconds to check for verification
    useEffect(() => {
        // If the user is already verified when they land here, redirect immediately.
        if (currentUser?.emailVerified) {
            navigate('/menu');
            return;
        }

        // Set up an interval to check for verification status.
        const interval = setInterval(async () => {
            if (auth.currentUser) {
                await auth.currentUser.reload();
                const freshUser = auth.currentUser;
                if (freshUser?.emailVerified) {
                    clearInterval(interval); // Stop the interval
                    toast.success("Email successfully verified!");
                    navigate('/menu');
                }
            }
        }, 3000); // Check every 3 seconds

        // Cleanup function to stop polling when the component is unmounted
        return () => clearInterval(interval);
    }, [currentUser, navigate]);

    const handleResendEmail = async () => {
        if (!currentUser) return;
        setIsSending(true);
        try {
            await sendEmailVerification(currentUser);
            toast.success("Verification email sent!", {
                description: "Please check your inbox (and spam folder)."
            });
        } catch (error) {
            toast.error("Failed to send email. Please try again later.");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };
    
    // This button provides an immediate check instead of waiting for the interval
    const handleManualCheck = async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser?.emailVerified) {
                 toast.success("Email successfully verified!");
                 navigate('/menu');
            } else {
                toast.error("Email not yet verified.", {
                    description: "Please click the link in the email we sent you, then try again."
                });
            }
        }
    };
    
    const handleLogout = async () => {
        await signOut(auth);
        navigate('/auth');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                        <MailCheck className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">Verify Your Email</CardTitle>
                    <CardDescription>
                        A verification link has been sent to: 
                        <span className="font-bold text-primary block mt-1">{currentUser?.email}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Click the link in the email to activate your account. Check Spam folder if not seen and then refresh.
                    </p>
                    <Button onClick={handleManualCheck} className="w-full">
                        I've Verified, Continue Now
                    </Button>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="w-full" onClick={handleResendEmail} disabled={isSending}>
                            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Resend Email
                        </Button>
                        <Button variant="secondary" className="w-full" onClick={handleLogout}>
                            Log Out
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default VerifyEmailPage;