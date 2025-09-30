import React from 'react';
// FIX: Removed useLocation as it's no longer needed
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export function UserLayout() {
  // FIX: Removed location and userId state logic
  // const location = useLocation();
  // const userId = location.state?.userId;

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarProvider>
        {/* FIX: AppSidebar no longer needs the userId prop */}
        <AppSidebar />
        <div className="absolute top-4 left-4">
          <SidebarTrigger />
        </div>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </SidebarProvider>
    </div>
  );
}