import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarProvider>
        <AdminSidebar />
        
        {/* FIX: Removed the z-20 class to allow the sidebar to correctly cover this button */}
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