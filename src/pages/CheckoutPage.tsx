import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/config/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IndianRupee, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

const paymentMethods = [
  { value: 'gpay', label: 'GPay' },
  { value: 'phonepe', label: 'PhonePe' },
  { value: 'paytm', label: 'Paytm' },
  { value: 'other', label: 'Other UPI' },
];

const CheckoutPage = () => {
  const location = useLocation();
  const { cart } = location.state || {};
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const calculateTotal = () => {
    return cart ? cart.reduce((total, item) => total + item.price * item.quantity, 0) : 0;
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to place an order.');
      navigate('/auth');
      return;
    }
    
    if (!cart || cart.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method.');
      return;
    }
    if (isScheduling && !scheduledTime) {
      toast.error('Please select a time for your scheduled order.');
      return;
    }

    setIsLoading(true);

    const orderId = `ORDER_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const orderItems = cart.map((item: CartItem) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }));
    const amount = calculateTotal();
    const scheduleLaterTimestamp = isScheduling && scheduledTime
      ? Timestamp.fromDate(new Date(`${new Date().toDateString()} ${scheduledTime}`))
      : null;
    const currentTimestamp = Timestamp.fromDate(new Date());

    try {
      await addDoc(collection(db, 'Orders'), {
        OrderID: orderId,
        OrderItems: orderItems,
        UserID: currentUser.uid, 
        Amount: amount,
        PaymentMethod: paymentMethod,
        ScheduleLater: scheduleLaterTimestamp,
        status: 'pending',
        isNotified: false,
        time: currentTimestamp,
        Notes: notes,
      });

      toast.success('Order placed successfully!');
      navigate('/myorder', { state: { userId: currentUser.uid, orderReady: orderId } });
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Error placing order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const total = calculateTotal();

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background text-foreground">
      <Card className="w-full max-w-2xl mx-auto bg-card text-card-foreground shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Checkout</CardTitle>
          <CardDescription>Finalize your order details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Order Summary</h3>
            <ul className="space-y-2">
              {cart && cart.length > 0 ? (
                cart.map((item: CartItem, index) => (
                  <li key={index} className="flex justify-between items-center text-sm p-3 rounded-md bg-secondary">
                    <span>{item.name} (x{item.quantity})</span>
                    <span className="flex items-center">
                      <IndianRupee className="h-4 w-4 mr-1" />
                      {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </li>
                ))
              ) : (
                <p className="text-muted-foreground text-center">Your cart is empty.</p>
              )}
            </ul>
            <div className="flex justify-between items-center text-lg font-bold border-t border-border pt-4">
              <span>Total:</span>
              <span className="flex items-center">
                <IndianRupee className="h-5 w-5" />
                {total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Order Type</h3>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={!isScheduling ? "default" : "outline"}
                className={`flex-col h-24 border-2 ${!isScheduling ? 'border-primary' : ''}`}
                onClick={() => setIsScheduling(false)}
              >
                <ArrowRight className="h-6 w-6 mb-2" />
                Normal Order
              </Button>
              <Button
                variant={isScheduling ? "default" : "outline"}
                className={`flex-col h-24 border-2 ${isScheduling ? 'border-primary' : ''}`}
                onClick={() => setIsScheduling(true)}
              >
                <Clock className="h-6 w-6 mb-2" />
                Schedule Later
              </Button>
            </div>
            {isScheduling && (
              <div className="grid gap-2">
                <Label htmlFor="scheduled-time">Scheduled Time</Label>
                <Select onValueChange={setScheduledTime} value={scheduledTime}>
                  <SelectTrigger id="scheduled-time">
                    <SelectValue placeholder="Select a time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">09:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="13:00">01:00 PM</SelectItem>
                    <SelectItem value="14:00">02:00 PM</SelectItem>
                    <SelectItem value="15:00">03:00 PM</SelectItem>
                    <SelectItem value="16:00">04:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Payment Method</h3>
            <div>
              <Combobox
                items={paymentMethods}
                onSelect={(value) => setPaymentMethod(value)}
                placeholder="Select a payment method"
                value={paymentMethod}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Notes for the kitchen</h3>
            <Textarea
              placeholder="Enter any special requests or notes here."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            onClick={handleCheckout}
            className="w-full h-12 text-lg font-bold bg-primary text-primary-foreground"
            disabled={isLoading || !paymentMethod || (isScheduling && !scheduledTime)}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Place Order
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutPage;