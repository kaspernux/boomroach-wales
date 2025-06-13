"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthForm } from "@/components/AuthForm";
import { TrendingUp, Shield, Zap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleAuthSuccess = () => {
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-neon-green/5">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-neon-green" />
          <span className="text-foreground text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-neon-green/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="text-foreground space-y-8 lg:pr-8">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-6xl font-pixel text-nuclear-glow text-glow">
              🪳 BoomRoach
            </h1>
            <p className="text-xl lg:text-2xl text-neon-green">
              Unkillable Meme Coin Trading Platform
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Join the strongest crypto community with AI-powered Hydra-Bot trading engines.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-neon-green/20 rounded-lg border border-neon-green/30">
                <TrendingUp className="h-6 w-6 text-neon-green" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-neon-green">6 Hydra Engines</h3>
                <p className="text-muted-foreground">Sniper, Re-entry, AI Signals, Guardian, Scalper, Arbitrage</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-nuclear-glow/20 rounded-lg border border-nuclear-glow/30">
                <Shield className="h-6 w-6 text-nuclear-glow" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-nuclear-glow">Unkillable Security</h3>
                <p className="text-muted-foreground">Military-grade protection and risk management</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-neon-blue/20 rounded-lg border border-neon-blue/30">
                <Zap className="h-6 w-6 text-neon-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-neon-blue">Real-time Power</h3>
                <p className="text-muted-foreground">Live analytics and lightning-fast execution</p>
              </div>
            </div>
          </div>

          <div className="glassmorphism border-nuclear-glow/30 p-6 rounded-xl">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-neon-green">94.7%</div>
                <div className="text-muted-foreground text-sm">Success Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-nuclear-glow">$5.2M+</div>
                <div className="text-muted-foreground text-sm">Total Volume</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-neon-blue">24.7K</div>
                <div className="text-muted-foreground text-sm">Army Members</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <AuthForm onSuccess={handleAuthSuccess} defaultTab="login" />
        </div>
      </div>
    </div>
  );
}
