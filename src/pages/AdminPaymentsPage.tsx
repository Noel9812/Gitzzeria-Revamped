"use client"

import * as React from "react"
import { collection, onSnapshot, query, where, getDocs, documentId, orderBy } from "firebase/firestore";
import { db } from '@/config/firebase';
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, DollarSign, ListOrdered, CreditCard, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface OrderItem {
  name: string;
  quantity: number;
}

export type Payment = {
  id: string; 
  OrderID: string;
  Amount: number;
  status: 'pending' | 'ready' | 'cancelled';
  UserID: string;
  time: { toDate: () => Date; };
  OrderItems: OrderItem[];
  customerName?: string; 
}

export const columns: ColumnDef<Payment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusStyles: { [key: string]: { text: string; className: string } } = {
            ready: { text: "Paid", className: "bg-green-500" },
            pending: { text: "Pending", className: "bg-orange-500" },
            cancelled: { text: "Cancelled", className: "bg-red-500" },
        };
        const { text, className } = statusStyles[status] || { text: "Unknown", className: "bg-gray-500" };

        return <Badge className={className}>{text}</Badge>
    },
    filterFn: (row, id, value) => {
        if (value === null) return true;
        return value === row.getValue(id);
    },
  },
  {
    accessorKey: "OrderID",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Order ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("OrderID")}</div>,
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => <div>{row.getValue("customerName") || "..."}</div>,
  },
  {
    accessorKey: "OrderItems",
    header: () => <div className="text-center">Items</div>,
    cell: ({ row }) => {
        const items = row.getValue("OrderItems") as OrderItem[];
        return (
            <div className="text-center">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ShoppingBag className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <ul className="list-disc pl-4 text-left">
                                {items && items.length > 0 ? (
                                    items.map((item, index) => (
                                        <li key={index}>{item.name} (x{item.quantity})</li>
                                    ))
                                ) : (
                                    <li>No items</li>
                                )}
                            </ul>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        )
    }
  },
  {
    accessorKey: "time",
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => {
      const timestamp = row.getValue("time") as { toDate: () => Date };
      return <div>{timestamp ? timestamp.toDate().toLocaleDateString() : 'N/A'}</div>;
    },
  },
  {
    accessorKey: "Amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("Amount"))
      const formatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original;
      return (
        <div className="text-center">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(payment.OrderID); toast.success("Order ID copied!") }}>
                Copy Order ID
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      )
    },
  },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-5))", // Orange color from your globals.css
  },
} satisfies ChartConfig;

export function AdminPaymentsPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [userNames, setUserNames] = React.useState<Map<string, string>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'time', desc: true }, // Default sort by time, newest first
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  React.useEffect(() => {
    const ordersCollection = collection(db, 'Orders');
    const unsubscribe = onSnapshot(ordersCollection, async (snapshot) => {
        const ordersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Payment[];
        
        const userIds = [...new Set(ordersList.map(order => order.UserID))].filter(id => id);
        if (userIds.length > 0) {
            const usersCollection = collection(db, "Users");
            const q = query(usersCollection, where(documentId(), 'in', userIds));
            const userSnapshot = await getDocs(q);
            const namesMap = new Map<string, string>();
            userSnapshot.forEach(doc => {
                namesMap.set(doc.id, doc.data().Name);
            });
            setUserNames(namesMap);
        }
        
        setPayments(ordersList);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching payments:", error);
        toast.error("Failed to fetch payments.");
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const dataWithCustomerNames = React.useMemo(() => {
    return payments.map(payment => ({
      ...payment,
      customerName: userNames.get(payment.UserID) || (payment.UserID ? payment.UserID.substring(0, 6) + '...' : 'Unknown')
    }));
  }, [payments, userNames]);

  const table = useReactTable({
    data: dataWithCustomerNames,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const { totalRevenue, pendingPayments, totalTransactions, chartData } = React.useMemo(() => {
    const totalRevenue = payments.filter(p => p.status === 'ready').reduce((sum, p) => sum + p.Amount, 0);
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const totalTransactions = payments.length;
    
    const dailyRevenue: { [key: string]: number } = {};
    payments.forEach(p => {
        if(p.status === 'ready' && p.time) {
            const date = p.time.toDate().toISOString().split('T')[0];
            dailyRevenue[date] = (dailyRevenue[date] || 0) + p.Amount;
        }
    });
    
    const chartData = Object.entries(dailyRevenue)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-7);

    return { totalRevenue, pendingPayments, totalTransactions, chartData };
  }, [payments]);

  return (
    <div className="w-full">
      <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">
        Payments Overview
      </h3>
      
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">All successful transactions</p>
                <div className="h-[60px] mt-4">
                  {chartData.length > 1 ? (
                    <ChartContainer config={chartConfig} className="min-h-[60px] w-full">
                        <AreaChart accessibilityLayer data={chartData} margin={{ top: 5, left: -20, right: 0, bottom: 0 }}>
                           <ChartTooltip 
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" hideLabel />} 
                            />
                            <defs>
                                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                           <Area dataKey="total" type="natural" fill="url(#fillRevenue)" stroke="var(--color-revenue)" stackId="a" strokeWidth={2} />
                        </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="text-xs text-muted-foreground pt-4 flex items-center justify-center h-full">
                        Not enough data to display trend.
                    </div>
                  )}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <ListOrdered className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{totalTransactions}</div>
                <p className="text-xs text-muted-foreground">Total orders placed</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{pendingPayments}</div>
                <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
            </CardContent>
        </Card>
      </div>
      
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by Order ID..."
          value={(table.getColumn("OrderID")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("OrderID")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-4">
                    Status
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => table.getColumn("status")?.setFilterValue(null)}>
                    All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => table.getColumn("status")?.setFilterValue('ready')}>
                    Paid
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => table.getColumn("status")?.setFilterValue('pending')}>
                    Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => table.getColumn("status")?.setFilterValue('cancelled')}>
                    Cancelled
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="w-full h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AdminPaymentsPage;