"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ComprehensiveDashboard } from "@/components/dashboard/ComprehensiveDashboard";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else {
        setIsLoadingDashboard(false);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isLoadingDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-neon-green/5">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-8 h-8 animate-spin text-neon-green" />
          <span className="text-foreground text-lg font-pixel">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  return <ComprehensiveDashboard />;
}
