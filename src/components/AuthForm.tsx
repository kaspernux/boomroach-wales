"use client";

import type React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Mail,
  Lock,
  Wallet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Zap
} from "lucide-react";

interface AuthFormProps {
  onSuccess?: () => void;
  defaultTab?: "login" | "register";
}

export function AuthForm({ onSuccess, defaultTab = "login" }: AuthFormProps) {
  const { login, register, user, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) clearError();
    if (success) setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    clearError();

    try {
      const result = await login({
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        setSuccess("Login successful!");
        onSuccess?.();
      }
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    clearError();

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        username: formData.username
      });

      if (result.success) {
        setSuccess("Registration successful!");
        onSuccess?.();
      }
    } catch (err) {
      console.error("Registration error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="glassmorphism border-neon-green/30">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-pixel text-neon-green text-glow">
            🪳 BoomRoach Army
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Join the unkillable meme coin revolution
          </p>
        </CardHeader>

        <CardContent>
          {user ? (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-nuclear-gradient flex items-center justify-center">
                <User className="w-8 h-8 text-background" />
              </div>
              <h3 className="text-lg font-semibold text-neon-green">
                Welcome, {user.username}!
              </h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-neon-green/10">
                  <Mail className="w-5 h-5 mx-auto mb-2 text-neon-green" />
                  <Badge className={user.isEmailVerified ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}>
                    {user.isEmailVerified ? "Email Verified" : "Email Pending"}
                  </Badge>
                </div>

                <div className="text-center p-3 rounded-lg bg-neon-blue/10">
                  <Wallet className="w-5 h-5 mx-auto mb-2 text-neon-blue" />
                  <Badge className={user.isWalletConnected ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}>
                    {user.isWalletConnected ? "Wallet Connected" : "Connect Wallet"}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full nuclear-gradient"
                    disabled={isProcessing || isLoading}
                  >
                    {isProcessing || isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Login to Army
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username (Optional)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-username"
                        placeholder="Choose a username"
                        value={formData.username}
                        onChange={(e) => handleInputChange("username", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum 8 characters required
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full nuclear-gradient"
                    disabled={isProcessing || isLoading}
                  >
                    {isProcessing || isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining Army...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Join the Army
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {error && (
            <Alert className="border-red-500/30 bg-red-500/10 mt-4">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500/30 bg-green-500/10 mt-4">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-400">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 p-3 rounded-lg bg-neon-orange/10 border border-neon-orange/30">
            <p className="text-xs text-center text-neon-orange">
              🧪 Demo Mode: Any email + 8+ character password works!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
