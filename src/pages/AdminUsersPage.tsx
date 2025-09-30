"use client"

import * as React from "react"
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from '@/config/firebase';
import { ColumnDef, useReactTable, getCoreRowModel, flexRender, getSortedRowModel, SortingState } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Data structure for a user document
export type User = {
  id: string;
  Name: string;
  UserID: string;
  AdminCheck: boolean;
}

// Function to toggle admin status
const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    const userRef = doc(db, "Users", userId);
    try {
        await updateDoc(userRef, { AdminCheck: !currentStatus });
        toast.success(`User status updated to ${!currentStatus ? 'Admin' : 'User'}.`);
    } catch (error) {
        toast.error("Failed to update user status.");
        console.error("Error updating user: ", error);
    }
};

// Column definitions for the data table
export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "Name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "UserID",
    header: "User ID",
  },
  {
    accessorKey: "AdminCheck",
    header: "Role",
    cell: ({ row }) => {
        const isAdmin = row.getValue("AdminCheck");
        return <Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "Admin" : "User"}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="text-right">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleToggleAdmin(user.id, user.AdminCheck)}>
                        {user.AdminCheck ? "Remove Admin" : "Make Admin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>View Orders</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      );
    },
  },
]

export function AdminUsersPage() {
    const [users, setUsers] = React.useState<User[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [sorting, setSorting] = React.useState<SortingState>([]);

    React.useEffect(() => {
        const usersCollection = collection(db, 'Users');
        const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as User[];
            setUsers(usersList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            toast.error("Failed to fetch users.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const table = useReactTable({
        data: users,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    return (
        <div className="w-full">
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">
                User Management
            </h3>
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={columns.length}><Skeleton className="w-full h-8" /></TableCell></TableRow>
                            ))
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No users found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default AdminUsersPage;