import React, { useState, useEffect } from 'react';
import { useAuth } from '@/config/AuthContext';
import { db, auth } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export function AccountPage() {
    const { currentUser } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch user data when the component loads
    useEffect(() => {
        if (currentUser) {
            setEmail(currentUser.email || '');
            const userDocRef = doc(db, 'Users', currentUser.uid);
            
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    setName(docSnap.data().Name);
                }
                setLoading(false);
            }).catch(error => {
                console.error("Error fetching user data:", error);
                toast.error("Failed to load profile data.");
                setLoading(false);
            });
        }
    }, [currentUser]);

    // Handle saving the updated name
    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !name) return;

        setIsSaving(true);
        const userDocRef = doc(db, 'Users', currentUser.uid);
        try {
            await updateDoc(userDocRef, { Name: name });
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error("Failed to update profile.");
            console.error("Error updating profile:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle sending a password reset email
    const handlePasswordReset = async () => {
        if (currentUser?.email) {
            try {
                await sendPasswordResetEmail(auth, currentUser.email);
                toast.info("Password reset email sent!", {
                    description: "Please check your inbox to reset your password.",
                });
            } catch (error) {
                toast.error("Failed to send reset email.");
                console.error("Error sending password reset email:", error);
            }
        }
    };
    
    if (loading) {
        return (
            <div className="w-full max-w-lg mx-auto">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-24" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>My Account</CardTitle>
                    <CardDescription>
                        View and edit your personal information.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSaveChanges} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input 
                                id="name" 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="Your full name"
                            />
                        </div>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </form>

                    <div className="border-t pt-6">
                        <h3 className="text-lg font-medium">Security</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Reset your password by sending a link to your email. 
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Check your Spam folder if you don't see it.
                        </p>
                        <Button variant="outline" onClick={handlePasswordReset}>
                            Send Password Reset Email
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default AccountPage;