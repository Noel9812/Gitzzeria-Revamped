import React, { useState, useEffect } from 'react';
import { collection, updateDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, IndianRupee, Bell, XCircle } from 'lucide-react';
import { toast } from 'sonner';

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

const AdminPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [scheduledOrders, setScheduledOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const ordersCollection = collection(db, 'Orders');
    const q = query(ordersCollection, where("status", "==", "pending"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList: Order[] = [];
      const scheduledOrdersList: Order[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data() as Omit<Order, 'id'>;
        const order = { id: doc.id, ...data };

        if (order.ScheduleLater) {
          scheduledOrdersList.push(order);
        } else {
          ordersList.push(order);
        }
      });
      
      setOrders(ordersList);
      setScheduledOrders(scheduledOrdersList);
      setLoading(false);
    }, (error) => {
      setError('Error fetching orders. Please try again later.');
      console.error('Error with onSnapshot listener: ', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOrderReady = async (orderId: string) => {
  try {
    const orderRef = doc(db, 'Orders', orderId);
    // FIX: Update both the order status and payment status
    await updateDoc(orderRef, { 
        status: 'ready',
        PaymentStatus: true 
    });
    toast.success(`Order #${orderId.substring(0, 6)} is ready!`);
  } catch (error) {
    console.error('Error updating order status: ', error);
    toast.error('Error marking order as ready.');
  }
};

  const handleCancelOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'Orders', orderId);
      await updateDoc(orderRef, { status: 'cancelled' });
      toast.info(`Order #${orderId.substring(0, 6)} has been cancelled.`);
    } catch (error) {
      console.error('Error canceling order: ', error);
      toast.error('Error canceling order.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Admin Dashboard</h1>
      {loading ? (
        <div className="flex justify-center items-center h-64 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading orders...</p>
        </div>
      ) : error ? (
        <div className="text-center text-destructive">{error}</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Orders Card */}
          <Card className="bg-card text-card-foreground shadow-lg border-border">
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground">No new orders.</p>
              ) : (
                orders.map(order => (
                  <Card key={order.id} className="p-4 bg-secondary">
                    <CardHeader className="flex-row items-center justify-between p-0">
                      <CardTitle className="text-lg font-semibold">Order #{order.OrderID}</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">Normal Order</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-2 mt-2">
                      <ul className="list-disc list-inside space-y-1 text-sm text-secondary-foreground">
                        {order.OrderItems.map((item, index) => (
                          <li key={index}>{item.name} - Quantity: {item.quantity}</li>
                        ))}
                      </ul>
                      <div className="flex justify-between items-center text-primary font-bold">
                        <span>Total:</span>
                        <span className="flex items-center"><IndianRupee className="h-4 w-4" />{order.Amount}</span>
                      </div>
                      <div className="flex gap-2 justify-end mt-4">
                        <Button variant="destructive" size="sm" onClick={() => handleCancelOrder(order.id)}>
                          <XCircle className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleOrderReady(order.id)}>
                          <Bell className="h-4 w-4 mr-1" /> Ready
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Scheduled Orders Card */}
          <Card className="bg-card text-card-foreground shadow-lg border-border">
            <CardHeader>
              <CardTitle>Scheduled Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduledOrders.length === 0 ? (
                <p className="text-center text-muted-foreground">No scheduled orders.</p>
              ) : (
                scheduledOrders.map(order => (
                  <Card key={order.id} className="p-4 bg-secondary">
                    <CardHeader className="flex-row items-center justify-between p-0">
                      <CardTitle className="text-lg font-semibold">Order #{order.OrderID}</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">Scheduled</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-2 mt-2">
                      <ul className="list-disc list-inside space-y-1 text-sm text-secondary-foreground">
                        {order.OrderItems.map((item, index) => (
                          <li key={index}>{item.name} - Quantity: {item.quantity}</li>
                        ))}
                      </ul>
                      <div className="flex justify-between items-center text-primary font-bold">
                        <span>Total:</span>
                        <span className="flex items-center"><IndianRupee className="h-4 w-4" />{order.Amount}</span>
                      </div>
                      <div className="flex gap-2 justify-end mt-4">
                        <Button variant="destructive" size="sm" onClick={() => handleCancelOrder(order.id)}>
                           <XCircle className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleOrderReady(order.id)}>
                          <Bell className="h-4 w-4 mr-1" /> Ready
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminPage;