"use client"

import * as React from "react"
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from '@/config/firebase';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
}
interface Order {
  status: 'pending' | 'ready' | 'cancelled';
  OrderItems: OrderItem[];
  Amount: number;
  time: { toDate: () => Date; };
}

// UPDATED: chartConfig with specific colors for status breakdown
const chartConfig = {
  quantity: { label: "Quantity Sold", color: "hsl(var(--chart-1))" }, // Default blue for bar chart
  revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },       // Default green for line chart
  
  // Custom colors for the Pie Chart segments
  pending: { label: "Pending", color: "hsl(28 95% 58%)" },   // Orange
  ready: { label: "Ready", color: "hsl(142 45% 36%)" },     // Green
  cancelled: { label: "Cancelled", color: "hsl(0 75% 50%)" }, // Red
} satisfies ChartConfig;

export function AdminDashboardPage() {
  const [allOrders, setAllOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ordersCollection = collection(db, 'Orders');
    const q = query(ordersCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const ordersList = snapshot.docs.map(doc => doc.data() as Order);
        setAllOrders(ordersList);
        setLoading(false);
    }, (err) => {
        console.error("Error fetching analytics data:", err);
        toast.error("Failed to load analytics data.");
        setError("Could not load analytics data.");
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const { popularItemsData, salesTrendData, statusBreakdownData } = React.useMemo(() => {
    const readyOrders = allOrders.filter(order => order.status === 'ready');

    // --- Calculation for Most Popular Items ---
    const itemCounts = new Map<string, number>();
    readyOrders.forEach(order => {
        if (order.OrderItems) {
            order.OrderItems.forEach(item => {
                itemCounts.set(item.name, (itemCounts.get(item.name) || 0) + item.quantity);
            });
        }
    });
    const popularItemsData = Array.from(itemCounts.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    // --- Calculation for Sales Trend ---
    const dailyRevenue = new Map<string, number>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    readyOrders.forEach(order => {
        const orderDate = order.time.toDate();
        if (orderDate >= thirtyDaysAgo) {
            const dateString = orderDate.toISOString().split('T')[0];
            dailyRevenue.set(dateString, (dailyRevenue.get(dateString) || 0) + order.Amount);
        }
    });
    const salesTrendData = Array.from(dailyRevenue.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // --- Calculation for Status Breakdown ---
    const statusCounts = { pending: 0, ready: 0, cancelled: 0 };
    allOrders.forEach(order => {
        if (order.status && statusCounts.hasOwnProperty(order.status)) {
            statusCounts[order.status]++;
        }
    });
    // Dynamically assign fill based on chartConfig for custom colors
    const statusBreakdownData = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        fill: chartConfig[status as keyof typeof chartConfig]?.color || 'hsl(var(--muted-foreground))' // Fallback color
    }));


    return { popularItemsData, salesTrendData, statusBreakdownData };
  }, [allOrders]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading Dashboard...</span>
      </div>
    );
  }
  
  if (error) {
    return <div className="text-center text-destructive">{error}</div>;
  }

  return (
    <div className="w-full space-y-6">
      <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
        Analytics Dashboard
      </h3>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Revenue Over Last 30 Days</CardTitle>
                <CardDescription>Daily revenue from all completed orders.</CardDescription>
            </CardHeader>
            <CardContent>
                {salesTrendData.length > 1 ? (
                    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                        <LineChart accessibilityLayer data={salesTrendData} margin={{ left: 12, right: 12 }}>
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `₹${value}`} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[250px] w-full items-center justify-center">
                        <p className="text-muted-foreground">Not enough data to display sales trend.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Order Status Overview</CardTitle>
                <CardDescription>A live breakdown of all order statuses.</CardDescription>
            </CardHeader>
            <CardContent>
                {allOrders.length > 0 ? (
                    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                        <PieChart accessibilityLayer>
                            <ChartTooltip content={<ChartTooltipContent nameKey="count" hideLabel />} />
                            <Pie data={statusBreakdownData} dataKey="count" nameKey="status" innerRadius={60} outerRadius={80} /> {/* Increased outerRadius for better visibility */}
                            <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                        </PieChart>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[250px] w-full items-center justify-center">
                        <p className="text-muted-foreground">No orders to analyze.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      
        <Card>
            <CardHeader>
                <CardTitle>Most Popular Items</CardTitle>
                <CardDescription>Top 5 best-selling items across all completed orders.</CardDescription>
            </CardHeader>
            <CardContent>
                {popularItemsData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                        <BarChart accessibilityLayer data={popularItemsData}>
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                            <YAxis tickFormatter={(value) => `${value}`} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="flex h-[300px] w-full items-center justify-center">
                        <p className="text-muted-foreground">No completed orders to analyze yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboardPage;