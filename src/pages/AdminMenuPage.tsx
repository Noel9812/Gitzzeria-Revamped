"use client"

import * as React from "react"
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '@/config/firebase';
import { ColumnDef, useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table"
import { MoreHorizontal, PlusCircle, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from '@/config/AuthContext';

// Data structure for a menu item
export type MenuItem = {
  id: string;
  ItemID: string;
  ItemName: string;
  description: string;
  price: number;
}

// Reusable Form for Add/Edit
const MenuItemForm = ({ item, onSave, onCancel }: { item: Partial<MenuItem> | null, onSave: (item: Omit<MenuItem, 'id'>) => void, onCancel: () => void }) => {
    const [formData, setFormData] = React.useState(item || { ItemName: '', description: '', price: 0, ItemID: '' });

    React.useEffect(() => {
        setFormData(item || { ItemName: '', description: '', price: 0, ItemID: '' });
    }, [item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Omit<MenuItem, 'id'>);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ItemName" className="text-right">Name</Label>
                    <Input id="ItemName" name="ItemName" value={formData.ItemName} onChange={handleChange} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Input id="description" name="description" value={formData.description} onChange={handleChange} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">Price (₹)</Label>
                    <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ItemID" className="text-right">Item ID</Label>
                    <Input id="ItemID" name="ItemID" value={formData.ItemID} onChange={handleChange} className="col-span-3" placeholder="e.g., V01" required />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save changes</Button>
            </DialogFooter>
        </form>
    );
};


export function AdminMenuPage() {
    const { currentUser } = useAuth();
    const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<MenuItem | null>(null);

    // Columns definition for the data table
    const columns: ColumnDef<MenuItem>[] = [
        { accessorKey: "ItemID", header: "Item ID" },
        { accessorKey: "ItemName", header: "Name" },
        { accessorKey: "description", header: "Description" },
        {
            accessorKey: "price",
            header: () => <div className="text-right">Price</div>,
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("price"));
                const formatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
                return <div className="text-right font-medium">{formatted}</div>;
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(item)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(item.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }
        }
    ];

    // Real-time data fetching
    React.useEffect(() => {
        const menuCollection = collection(db, 'MenuItems');
        const unsubscribe = onSnapshot(menuCollection, (snapshot) => {
            const itemsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuItem[];
            setMenuItems(itemsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching menu items:", error);
            toast.error("Failed to fetch menu items.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const table = useReactTable({
        data: menuItems,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const handleAddNew = () => {
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (item: MenuItem) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const handleDelete = async (itemId: string) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            try {
                await deleteDoc(doc(db, "MenuItems", itemId));
                toast.success("Item deleted successfully.");
            } catch (error) {
                toast.error("Failed to delete item.");
                console.error("Error deleting document: ", error);
            }
        }
    };

    const handleSave = async (itemData: Omit<MenuItem, 'id'>) => {
        try {
            if (editingItem) {
                // Update existing item
                const itemRef = doc(db, "MenuItems", editingItem.id);
                await updateDoc(itemRef, itemData);
                toast.success("Item updated successfully.");
            } else {
                // Add new item
                await addDoc(collection(db, "MenuItems"), itemData);
                toast.success("Item added successfully.");
            }
            setIsDialogOpen(false);
            setEditingItem(null);
        } catch (error) {
            toast.error("Failed to save item.");
            console.error("Error saving document: ", error);
        }
    };
    
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Menu Management</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
                            <DialogDescription>
                                {editingItem ? "Make changes to the item here." : "Add a new item to your menu here."} Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>
                        <MenuItemForm item={editingItem} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>{/* ... TableHeader ... */}</TableHeader>
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
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No menu items found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default AdminMenuPage;