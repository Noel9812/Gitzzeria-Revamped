import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, addDoc, serverTimestamp, where, query, onSnapshot, orderBy, updateDoc, arrayUnion, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/config/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';

// Define types to match the new data model
interface Message {
  text: string;
  senderId: string;
  senderName: string;
  timestamp: { toDate: () => Date };
}
interface QueryItem {
  id: string;
  subject: string;
  status: string;
  messages: Message[];
  lastUpdatedAt: { toDate: () => Date };
}
interface PlacedOrder { 
  orderId: string;
}

const SupportPage = () => {
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [form, setForm] = useState({ subject: '', description: '', area: '', orderId: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, userName } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    
    const supportQuery = query(collection(db, 'Support'), where('UserID', '==', currentUser.uid), orderBy('lastUpdatedAt', 'desc'));
    
    const unsubscribeQueries = onSnapshot(supportQuery, (snapshot) => {
        const previousQueries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueryItem));
        setQueries(previousQueries);
    });

    const fetchUserOrders = async () => {
      const userOrdersQuery = query(
        collection(db, 'Orders'), 
        where('UserID', '==', currentUser.uid), 
        where('status', 'in', ['ready', 'cancelled']),
        orderBy('time', 'desc')
      );
      const userOrdersSnapshot = await getDocs(userOrdersQuery);
      const userOrdersList = userOrdersSnapshot.docs.map(doc => ({ orderId: doc.data().OrderID }));
      setOrders(userOrdersList);
    };
    
    fetchUserOrders();

    return () => unsubscribeQueries();
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prevForm => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userName) return toast.error("You must be logged in.");
    if (!form.subject || !form.description) return toast.error("Please fill in subject and description.");
    
    setIsLoading(true);
    const newTicket = {
      subject: form.subject,
      UserID: currentUser.uid,
      userName: userName,
      status: 'Open',
      area: form.area,
      orderId: form.orderId || '',
      createdAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
      messages: [{
          text: form.description,
          senderId: currentUser.uid,
          senderName: userName,
          timestamp: Timestamp.now(),
      }]
    };

    try {
      await addDoc(collection(db, 'Support'), newTicket);
      toast.success("Query Submitted!");
      setForm({ subject: '', description: '', area: '', orderId: '' });
    } catch (error) {
      console.error('Error submitting query: ', error);
      toast.error("Failed to submit query.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const QueryHistoryList = () => {
    const [replyText, setReplyText] = useState("");
    const [openTicketId, setOpenTicketId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      if (openTicketId) {
        setTimeout(scrollToBottom, 100); // Small delay to allow content to render
      }
    }, [queries, openTicketId]);

    const handleReply = async (ticketId: string) => {
        if (!replyText.trim() || !currentUser || !userName) return;
        
        const newReply = {
            text: replyText,
            senderId: currentUser.uid,
            senderName: userName,
            timestamp: Timestamp.now(),
        };

        try {
            const ticketRef = doc(db, "Support", ticketId);
            await updateDoc(ticketRef, {
                messages: arrayUnion(newReply),
                lastUpdatedAt: serverTimestamp(),
            });
            setReplyText("");
            toast.success("Reply sent!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to send reply.");
        }
    };
    
    return (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-3">
          {queries.map(queryItem => (
            <Collapsible 
              key={queryItem.id}
              open={openTicketId === queryItem.id}
              onOpenChange={(isOpen) => setOpenTicketId(isOpen ? queryItem.id : null)}
            >
              <div className="flex items-center justify-between p-4 bg-secondary rounded-md">
                <div className="flex items-center gap-4">
                    <span className="font-medium">{queryItem.subject}</span>
                    <Badge variant={queryItem.status === 'Resolved' ? 'default' : 'secondary'}>{queryItem.status}</Badge>
                </div>
                <CollapsibleTrigger asChild>
                   <Button variant="ghost" size="sm" className="w-9 p-0"><ChevronDown className="h-4 w-4" /><span className="sr-only">Toggle</span></Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="p-4 mt-2 border rounded-md">
                <div className="space-y-3 rounded-md p-3 max-h-64 overflow-y-auto mb-4">
                    {queryItem.messages.map((msg, index) => (
                      <div key={index} className={`flex flex-col ${msg.senderId === currentUser?.uid ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${msg.senderId === currentUser?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="font-bold mb-1">{msg.senderName}</p>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <p className="text-xs text-right text-muted-foreground/80 mt-1">
                                {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                {queryItem.status !== 'Resolved' && (
                    <div className="flex gap-2">
                        <Textarea placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                        <Button onClick={() => handleReply(queryItem.id)} size="icon" disabled={!replyText.trim()}><Send className="h-4 w-4" /></Button>
                    </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
    );
  };
  
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Support</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <Card className="bg-card text-card-foreground shadow-lg border-border">
            <CardHeader>
              <CardTitle>Report an issue</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="area">Area</Label>
                  <Select onValueChange={(value) => handleSelectChange('area', value)} value={form.area} required>
                    <SelectTrigger id="area"><SelectValue placeholder="Select area" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feedback">General Feedback</SelectItem>
                      <SelectItem value="order-query">Order Query</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.area === 'order-query' && (
                  <div className="grid gap-2">
                    <Label htmlFor="orderId">Related Order</Label>
                    <Select onValueChange={(value) => handleSelectChange('orderId', value)} value={form.orderId}>
                      <SelectTrigger id="orderId"><SelectValue placeholder="Select a past order" /></SelectTrigger>
                      <SelectContent>
                        {orders.length > 0 ? (
                            orders.map(order => (
                                <SelectItem key={order.orderId} value={order.orderId}>
                                    Order #{order.orderId}
                                </SelectItem>
                            ))
                        ) : (
                            <div className="p-2 text-sm text-muted-foreground">No past orders found.</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" placeholder="e.g., Incorrect item in order" value={form.subject} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Please include all relevant details." value={form.description} onChange={handleInputChange} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Query
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="bg-card text-card-foreground shadow-lg border-border">
            <CardHeader><CardTitle>Previous Queries</CardTitle></CardHeader>
            <CardContent>
              {queries.length === 0 ? <p className="text-center text-muted-foreground pt-4">No previous queries.</p> : <QueryHistoryList />}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default SupportPage;