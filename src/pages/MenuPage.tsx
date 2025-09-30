import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { motion } from 'framer-motion'; // NEW: Import motion from framer-motion
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { IndianRupee, ShoppingCart, Plus, Minus, Frown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { MenuItem, CartItem } from '@/types/index';

// NEW: Animation variants for the container and individual items
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const MenuPage = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [foodItems, setFoodItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const menuItemsCollection = collection(db, 'MenuItems');
        const menuItemsSnapshot = await getDocs(menuItemsCollection);
        const menuItemsList = menuItemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MenuItem[];
        setFoodItems(menuItemsList);
      } catch (err) {
        setError("Failed to fetch menu items. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenuItems();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredItems(foodItems);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = foodItems.filter(item =>
        item.ItemName.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, foodItems]);

  const addToCart = (itemName: string, price: number) => {
    setCart(prevCart => {
      const itemIndex = prevCart.findIndex(item => item.name === itemName);
      if (itemIndex > -1) {
        const updatedCart = [...prevCart];
        updatedCart[itemIndex].quantity += 1;
        return updatedCart;
      }
      return [...prevCart, { name: itemName, price, quantity: 1 }];
    });
  };

  const increaseQuantity = (itemName: string) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.name === itemName ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseQuantity = (itemName: string) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.name === itemName && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ).filter(item => !(item.name === itemName && item.quantity <= 1))
    );
  };
  
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const checkout = () => {
    if (cart.length > 0) {
      navigate('/checkout', { state: { cart: cart } });
    }
  };

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-6">
        <div className="mb-6">
          <Input 
            type="text"
            placeholder="Search for food..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm"
          />
        </div>
        
        {/* CHANGED: The grid is now a motion.div with animation variants */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {isLoading ? (
            [...Array(8)].map((_, index) => (
              <Skeleton key={index} className="w-full max-w-xs h-64 rounded-lg" />
            ))
          ) : error ? (
            <div className="col-span-full flex flex-col items-center justify-center p-8 text-destructive">
              <Frown className="h-16 w-16 mb-4" />
              <p className="text-center">{error}</p>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map(item => (
              // CHANGED: Each card is now wrapped in a motion.div for individual animation
              <motion.div key={item.id} variants={itemVariants}>
                <Card className="max-w-xs h-full overflow-hidden rounded-lg shadow-lg bg-card text-card-foreground border-border hover:shadow-xl transition-shadow duration-300">
                  <div className="relative w-full h-32 overflow-hidden">
                    <img
                      src={(item as any).image || `https://placehold.co/200x128/000000/FFFFFF/png?text=${encodeURIComponent(item.ItemName)}`}
                      alt={`Delicious ${item.ItemName}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-3 flex flex-col gap-2">
                    <h3 className="text-lg font-bold text-foreground">{item.ItemName}</h3>
                    <div className="flex items-center justify-between text-muted-foreground text-sm">
                      <p>Price:</p>
                      <div className="flex items-center">
                        <IndianRupee className="h-4 w-4" />
                        <p className="font-bold text-primary">{item.price}</p>
                      </div>
                    </div>
                    <Button onClick={() => addToCart(item.ItemName, item.price)} className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Frown className="h-16 w-16 mb-4" />
              <p className="text-center">
                {foodItems.length > 0 ? "No food items found matching your search." : "No menu items to display."}
              </p>
            </div>
          )}
        </motion.div>
      </main>

      {/* Cart Dialog component is unchanged */}
      {cart.length > 0 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="fixed bottom-4 right-4 z-50 rounded-full w-16 h-16 relative">
              <ShoppingCart className="h-6 w-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white text-xs font-bold">
                  {totalItems}
                </span>
              )}
              <span className="sr-only">Open Cart</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>My Cart ({totalItems})</DialogTitle>
              <DialogDescription>
                Review your selected food items before checking out.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {cart.length === 0 ? (
                <div className="text-center text-muted-foreground">Your cart is empty.</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.name} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                      <div className="flex-1">
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ₹{item.price.toFixed(2)} x {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => decreaseQuantity(item.name)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span>{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => increaseQuantity(item.name)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold pt-4 border-t">
                <span>Total:</span>
                <span className="flex items-center"><IndianRupee className="h-5 w-5" />{total.toFixed(2)}</span>
              </div>
            </div>
            <Button onClick={checkout} disabled={cart.length === 0} className="w-full">
              Checkout
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MenuPage;