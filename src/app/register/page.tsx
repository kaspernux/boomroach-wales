"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthForm } from "@/components/AuthForm";
import { CheckCircle, Shield, Zap, Loader2, Rocket, Crown, Bot } from "lucide-react";

export default function RegisterPage() {
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
        {/* Left Side - Join Benefits */}
        <div className="text-foreground space-y-8 lg:pr-8">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-6xl font-pixel text-nuclear-glow text-glow">
              🪳 Join the Army
            </h1>
            <p className="text-xl lg:text-2xl text-neon-green">
              Become an Unkillable Trader
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Join thousands of roaches surviving and thriving in the crypto apocalypse.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-neon-green/20 rounded-lg border border-neon-green/30">
                <Rocket className="h-6 w-6 text-neon-green" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-neon-green">Instant Access</h3>
                <p className="text-muted-foreground">Start trading with demo mode immediately</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-nuclear-glow/20 rounded-lg border border-nuclear-glow/30">
                <Crown className="h-6 w-6 text-nuclear-glow" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-nuclear-glow">Elite Features</h3>
                <p className="text-muted-foreground">Access to all 6 Hydra-Bot trading engines</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-neon-blue/20 rounded-lg border border-neon-blue/30">
                <Bot className="h-6 w-6 text-neon-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-neon-blue">AI-Powered Trading</h3>
                <p className="text-muted-foreground">Advanced algorithms for maximum profits</p>
              </div>
            </div>
          </div>

          <div className="glassmorphism border-nuclear-glow/30 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-nuclear-glow mb-4">What You Get:</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-neon-green flex-shrink-0" />
                <span className="text-sm">Free access to demo trading</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-neon-green flex-shrink-0" />
                <span className="text-sm">Real-time market analytics</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-neon-green flex-shrink-0" />
                <span className="text-sm">Community chat and signals</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-neon-green flex-shrink-0" />
                <span className="text-sm">Portfolio tracking dashboard</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-neon-green flex-shrink-0" />
                <span className="text-sm">Educational resources</span>
              </div>
            </div>
          </div>

          <div className="bg-neon-orange/10 border border-neon-orange/30 p-4 rounded-lg">
            <p className="text-sm text-neon-orange font-medium">
              🎯 Pro Tip: Connect your wallet after registration to unlock live trading with BOOMROACH tokens!
            </p>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <AuthForm onSuccess={handleAuthSuccess} defaultTab="register" />
        </div>
      </div>
    </div>
  );
}
