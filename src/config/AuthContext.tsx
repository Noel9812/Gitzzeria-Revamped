import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';

interface Notification {
  id: string;
  message: string;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  userName: string | null;
  notifications: Notification[];
  hasUnread: boolean;
  markNotificationsAsRead: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  isAdmin: false,
  userName: null,
  notifications: [],
  hasUnread: false,
  markNotificationsAsRead: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "Users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.AdminCheck === true);
          setUserName(userData.Name);
        } else {
          setIsAdmin(false);
          setUserName(null);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
        setUserName(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser || isAdmin) return;

    const ordersRef = collection(db, "Orders");
    // FIX: This query now correctly filters for the specific logged-in user's ID
    const q = query(
      ordersRef,
      where("UserID", "==", currentUser.uid),
      where("status", "in", ["ready", "cancelled"]),
      where("isNotified", "==", false)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const newNotifications: Notification[] = [];
        const batch = writeBatch(db);

        snapshot.forEach(docSnapshot => { 
          const order = docSnapshot.data();
          const message = `Order #${order.OrderID} is now ${order.status}!`;
          newNotifications.push({ id: docSnapshot.id, message });
          
          const docRef = doc(db, "Orders", docSnapshot.id);
          batch.update(docRef, { isNotified: true });
        });

        setNotifications(prev => {
            const allNotifications = [...newNotifications, ...prev];
            const uniqueNotifications = Array.from(new Map(allNotifications.map(n => [n.id, n])).values());
            return uniqueNotifications;
        });
        
        setHasUnread(true);
        await batch.commit();
      }
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  const markNotificationsAsRead = () => {
    setHasUnread(false);
  };
  
  const value = { currentUser, loading, isAdmin, userName, notifications, hasUnread, markNotificationsAsRead };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);