"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AmbientBackground } from "@/components/ambient/ambient-background";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Ambient background active throughout the entire application */}
      <AmbientBackground intensity="dashboard" />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content wrapper with generous spacious padding */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
          <Topbar />

          <main id="main-content" className="flex-1 p-5 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
