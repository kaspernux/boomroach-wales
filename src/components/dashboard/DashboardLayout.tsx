"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Bot,
  PieChart,
  History,
  Shield,
  Users,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth, type User } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User | null;
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Trading Engines",
    href: "/dashboard/engines",
    icon: Bot,
  },
  {
    name: "Portfolio",
    href: "/dashboard/portfolio",
    icon: PieChart,
  },
  {
    name: "Trading History",
    href: "/dashboard/trades",
    icon: History,
  },
  {
    name: "Risk Management",
    href: "/dashboard/risk",
    icon: Shield,
  },
  {
    name: "Social Trading",
    href: "/dashboard/social",
    icon: Users,
  },
  {
    name: "Wallet",
    href: "/dashboard/wallet",
    icon: Wallet,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case "LOW": return "bg-green-500/20 text-green-400";
      case "MEDIUM": return "bg-yellow-500/20 text-yellow-400";
      case "HIGH": return "bg-red-500/20 text-red-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-800/50 backdrop-blur border-r border-slate-700
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo and close button */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">BoomRoach</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User info */}
          {user && (
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-purple-600 text-white">
                    {getUserInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.username}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      Level {user.level}
                    </Badge>
                    <Badge className={`text-xs ${getRiskLevelColor(user.riskTolerance)}`}>
                      {user.riskTolerance}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-slate-700/50 rounded">
                  <div className="text-white font-medium">{user.totalTrades}</div>
                  <div className="text-slate-400">Trades</div>
                </div>
                <div className="text-center p-2 bg-slate-700/50 rounded">
                  <div className={`font-medium ${user.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${user.totalPnL.toFixed(2)}
                  </div>
                  <div className="text-slate-400">P&L</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-slate-700">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-4">
              {/* Status indicators */}
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-slate-300">All Systems Operational</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-slate-300">Live Data</span>
                </div>
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                  3
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
