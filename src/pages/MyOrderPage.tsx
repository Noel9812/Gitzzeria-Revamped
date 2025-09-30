import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/config/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderItem {
  name: string;
  quantity: number;
}

interface Order {
  id: string;
  OrderID: string;
  OrderItems: OrderItem[];
  Amount: number;
  PaymentStatus: boolean;
  ScheduleLater: boolean;
  status: 'pending' | 'ready' | 'cancelled';
}

const MyOrderPage = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) { setIsLoading(false); return; }
    
    const ordersCollection = collection(db, 'Orders');
    const q = query(ordersCollection, where('UserID', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      setAllOrders(ordersData);
      setIsLoading(false);
    }, (err) => {
      setError("Failed to load orders. Please try again.");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const pendingOrders = allOrders.filter(order => order.status === 'pending');
  const pastOrders = allOrders.filter(order => order.status === 'ready' || order.status === 'cancelled');

  const OrderList = ({ orders, emptyMessage }: { orders: Order[], emptyMessage: string }) => {
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'ready':
                return { text: 'Ready', color: 'bg-green-500' };
            case 'cancelled':
                return { text: 'Cancelled', color: 'bg-red-500' };
            default:
                return { text: 'Pending', color: 'bg-orange-500' };
        }
    };
    
    if (orders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
          <ClipboardList className="h-16 w-16 mb-4" />
          <p className="text-center">{emptyMessage}</p>
        </div>
      );
    }
    
    return (
      <div className="grid gap-6">
        {orders.map(order => {
          const statusInfo = getStatusInfo(order.status);
          return (
            <Card key={order.id} className="bg-card text-card-foreground shadow-lg border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold">Order #{order.OrderID}</CardTitle>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Status:</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex flex-col gap-2">
                    {order.OrderItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">Quantity: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-lg font-bold text-primary">
                      <span>Total:</span>
                      <span className="flex items-center">
                        <IndianRupee className="h-4 w-4" />
                        <span>{order.Amount}</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Payment Status:</span>
                      <span>{order.PaymentStatus ? 'Paid' : 'Unpaid'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Scheduled:</span>
                      <span>{order.ScheduleLater ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    );
  };
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-foreground">My Orders</h1>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
       ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="pending">Pending Orders ({pendingOrders.length})</TabsTrigger>
            <TabsTrigger value="past">Past Orders ({pastOrders.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <OrderList orders={pendingOrders} emptyMessage="You have no pending orders right now." />
          </TabsContent>
          <TabsContent value="past">
            <OrderList orders={pastOrders} emptyMessage="You have no past orders yet." />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MyOrderPage;