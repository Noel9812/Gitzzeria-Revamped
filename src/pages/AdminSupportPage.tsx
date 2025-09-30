"use client"

import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, where, getDocs, documentId, arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/config/AuthContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, ChevronsUpDown, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Message {
  text: string;
  senderId: string;
  senderName: string;
  timestamp: { toDate: () => Date };
}
// NEW: Updated interface to include all fields from the user's form
interface SupportTicket {
  id: string;
  UserID: string;
  userName: string;
  area: 'feedback' | 'order-query' | 'technical';
  subject: string;
  orderId?: string;
  securityLevel?: string;
  status: 'Open' | 'Resolved';
  messages: Message[];
  lastUpdatedAt: { toDate: () => Date };
}

const AdminSupportPage = () => {
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const supportCollection = collection(db, 'Support');
    const q = query(supportCollection, orderBy('lastUpdatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const allTicketsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
      setAllTickets(allTicketsList);
      
      const userIds = [...new Set(allTicketsList.map(t => t.UserID))].filter(Boolean);
      if (userIds.length > 0) {
        const usersCollection = collection(db, "Users");
        const userQuery = query(usersCollection, where(documentId(), 'in', userIds));
        const userSnapshot = await getDocs(userQuery);
        const namesMap = new Map<string, string>();
        userSnapshot.forEach(doc => namesMap.set(doc.id, doc.data().Name));
        setUserNames(namesMap);
      }
      
      setLoading(false);
    }, (err) => {
      console.error("Error fetching support tickets: ", err);
      setError("Failed to load support tickets.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openTickets = allTickets.filter(t => t.status === 'Open');
  const resolvedTickets = allTickets.filter(t => t.status === 'Resolved');
  
  const TicketList = ({ tickets }: { tickets: SupportTicket[] }) => {
    const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
    const [openTicketId, setOpenTicketId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      if (openTicketId) {
        setTimeout(scrollToBottom, 100);
      }
    }, [tickets, openTicketId]);
  
    const handleReply = async (ticket: SupportTicket) => {
        const text = replyText[ticket.id];
        if (!text || !text.trim() || !currentUser) return;
  
        const newReply = {
            text: text,
            senderId: currentUser.uid,
            senderName: "Admin",
            timestamp: Timestamp.now(),
        };
  
        try {
            const ticketRef = doc(db, 'Support', ticket.id);
            await updateDoc(ticketRef, {
                messages: arrayUnion(newReply),
                lastUpdatedAt: serverTimestamp(),
            });
            setReplyText(prev => ({...prev, [ticket.id]: ''}));
            toast.success("Reply sent!");
        } catch (error) {
            toast.error("Failed to send reply.");
            console.error(error);
        }
    };

    const handleToggleResolve = async (ticket: SupportTicket) => {
        try {
          const ticketRef = doc(db, 'Support', ticket.id);
          const newStatus = ticket.status === 'Open' ? 'Resolved' : 'Open';
          await updateDoc(ticketRef, { 
              status: newStatus, 
              lastUpdatedAt: serverTimestamp() 
          });
          toast.success(`Ticket marked as ${newStatus}.`);
        } catch (err) {
          toast.error("Failed to update ticket status.");
        }
    };
  
    if (tickets.length === 0) {
        return <p className="text-muted-foreground text-center pt-8">No tickets in this category.</p>
    }

    return (
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Collapsible 
            key={ticket.id} 
            open={openTicketId === ticket.id}
            onOpenChange={(isOpen) => setOpenTicketId(isOpen ? ticket.id : null)}
            className="overflow-hidden rounded-lg border bg-secondary"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
              <div>
                <p className="font-semibold">{ticket.subject}</p>
                <p className="text-sm text-muted-foreground">From: {userNames.get(ticket.UserID) || ticket.userName}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 bg-background p-4">
              {/* NEW: Added a details section */}
              <div className="grid grid-cols-[auto,1fr] items-center gap-x-4 gap-y-2 text-sm border-b pb-4 mb-4">
                <div className="font-semibold text-muted-foreground">Area:</div>
                <div><Badge variant="outline">{ticket.area}</Badge></div>

                {ticket.orderId && (
                  <>
                    <div className="font-semibold text-muted-foreground">Related Order:</div>
                    <div><Badge>{ticket.orderId}</Badge></div>
                  </>
                )}
                {ticket.securityLevel && (
                  <>
                    <div className="font-semibold text-muted-foreground">Severity:</div>
                    <div><Badge variant="secondary">{ticket.securityLevel}</Badge></div>
                  </>
                )}
              </div>

              <div className="space-y-3 rounded-md border p-3 max-h-64 overflow-y-auto">
                {ticket.messages.map((msg, index) => (
                  <div key={index} className={`flex flex-col ${msg.senderId === ticket.UserID ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${msg.senderId === ticket.UserID ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                        <p className="font-bold mb-1">{msg.senderName}</p>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <p className="text-xs text-right text-muted-foreground/80 mt-1">{msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {ticket.status === 'Open' && (
                <div className="flex gap-2">
                    <Textarea 
                        placeholder="Type your reply here..." 
                        value={replyText[ticket.id] || ''} 
                        onChange={(e) => setReplyText(prev => ({...prev, [ticket.id]: e.target.value}))} />
                    <Button onClick={() => handleReply(ticket)} size="icon" disabled={!replyText[ticket.id] || !replyText[ticket.id].trim()}><Send className="h-4 w-4" /></Button>
                </div>
              )}
              <div className="flex justify-end">
                  <Button size="sm" variant={ticket.status === 'Open' ? 'default' : 'outline'} onClick={() => handleToggleResolve(ticket)}>
                      <CheckCircle className="mr-2 h-4 w-4"/>
                      {ticket.status === 'Open' ? 'Mark as Resolved' : 'Re-open Ticket'}
                  </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Admin Support</h1>
      {loading ? ( 
        <div className="flex justify-center items-center h-64 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading open tickets...</p>
        </div> 
      ) : error ? ( 
        <div className="text-center text-destructive">{error}</div> 
      ) : (
        <Tabs defaultValue="open">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="open">Open Tickets ({openTickets.length})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved Tickets ({resolvedTickets.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-4">
                <TicketList tickets={openTickets} />
            </TabsContent>
            <TabsContent value="resolved" className="mt-4">
                <TicketList tickets={resolvedTickets} />
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminSupportPage;