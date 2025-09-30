import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
// FIX: The complete list of icons is now correctly imported from lucide-react
import {
  Bell,
  GalleryVerticalEnd,
  LayoutGrid,
  ReceiptText,
  HeartHandshake,
  LogOut,
  UserCircle,
  ChevronsLeftRight,
  ChevronDown
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/config/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';

export function AppSidebar() {
  const { toggleSidebar, state } = useSidebar();
  const { currentUser, userName, notifications, hasUnread, markNotificationsAsRead } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
        await signOut(auth);
        navigate('/');
    } catch(e) {
        console.error("Error signing out: ", e)
    }
  }

  const userEmail = currentUser?.email || 'user@example.com';

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 p-2">
          {state !== 'collapsed' && (
            <div className="flex items-center gap-2 font-bold text-2xl">
              <GalleryVerticalEnd className="h-6 w-6 text-primary" />
              <span>Gitzzeria</span>
            </div>
          )}
          <div className="flex items-center">
            <DropdownMenu onOpenChange={(open) => { if (open) markNotificationsAsRead(); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {hasUnread && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map(notif => (
                    <DropdownMenuItem key={notif.id} onSelect={() => navigate('/myorder')}>
                      <p className="whitespace-normal">{notif.message}</p>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No new notifications</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <ChevronsLeftRight className={`h-5 w-5 transition-transform duration-300 ${state === 'collapsed' ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/menu">
                    <LayoutGrid className="mr-2 h-5 w-5" />
                    <span>Menu</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/myorder">
                    <ReceiptText className="mr-2 h-5 w-5" />
                    <span>My Orders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/support">
                    <HeartHandshake className="mr-2 h-5 w-5" />
                    <span>Support</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser?.photoURL || "https://ui.shadcn.com/avatars/01.png"} />
                    <AvatarFallback>{userName?.charAt(0).toUpperCase() || userEmail?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="font-medium truncate">{userName || 'User'}</span>
                    <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Account</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}