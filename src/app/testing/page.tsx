"use client";

import React from "react";
import { WalletTesting } from "@/components/testing/WalletTesting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  TestTube,
  Shield,
  Zap,
  Users,
  TrendingUp,
  Mail,
  Database,
  Globe,
  Info,
  CheckCircle
} from "lucide-react";

export default function TestingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-neon-green/5 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-6xl font-pixel text-nuclear-glow text-glow">
            🧪 UAT Testing Suite
          </h1>
          <p className="text-xl text-neon-green">
            User Acceptance Testing for BoomRoach Platform
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive testing environment for validating all platform features including
            wallet integration, trading systems, real-time data, and user experience.
          </p>
        </div>

        {/* Testing Status Overview */}
        <Card className="glassmorphism border-nuclear-glow/30">
          <CardHeader>
            <CardTitle className="text-nuclear-glow flex items-center space-x-2">
              <TestTube className="w-6 h-6" />
              <span>Testing Environment Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-neon-green/10 border border-neon-green/30">
                <Shield className="w-8 h-8 mx-auto mb-2 text-neon-green" />
                <h3 className="font-semibold text-neon-green">Security</h3>
                <Badge className="bg-green-500/20 text-green-400 mt-2">Ready</Badge>
              </div>

              <div className="text-center p-4 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                <Zap className="w-8 h-8 mx-auto mb-2 text-neon-blue" />
                <h3 className="font-semibold text-neon-blue">Real-Time</h3>
                <Badge className="bg-green-500/20 text-green-400 mt-2">Active</Badge>
              </div>

              <div className="text-center p-4 rounded-lg bg-neon-orange/10 border border-neon-orange/30">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-neon-orange" />
                <h3 className="font-semibold text-neon-orange">Trading</h3>
                <Badge className="bg-green-500/20 text-green-400 mt-2">Demo Mode</Badge>
              </div>

              <div className="text-center p-4 rounded-lg bg-neon-purple/10 border border-neon-purple/30">
                <Database className="w-8 h-8 mx-auto mb-2 text-neon-purple" />
                <h3 className="font-semibold text-neon-purple">Database</h3>
                <Badge className="bg-green-500/20 text-green-400 mt-2">Connected</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Authentication Testing */}
          <Card className="glassmorphism border-neon-green/30">
            <CardHeader>
              <CardTitle className="text-neon-green flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Authentication</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Email Registration</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Login/Logout</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Password Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Session Management</span>
              </div>
            </CardContent>
          </Card>

          {/* Email System Testing */}
          <Card className="glassmorphism border-neon-blue/30">
            <CardHeader>
              <CardTitle className="text-neon-blue flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Email System</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Welcome Emails</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Verification Flow</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Password Reset</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Trading Alerts</span>
              </div>
            </CardContent>
          </Card>

          {/* Performance Testing */}
          <Card className="glassmorphism border-nuclear-glow/30">
            <CardHeader>
              <CardTitle className="text-nuclear-glow flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Load Testing</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">WebSocket Stress</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">API Response Times</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Mobile Performance</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Testing Component */}
        <WalletTesting />

        {/* Additional Testing Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Testing Instructions */}
          <Card className="glassmorphism border-neon-orange/30">
            <CardHeader>
              <CardTitle className="text-neon-orange flex items-center space-x-2">
                <Users className="w-6 h-6" />
                <span>Testing Team Roles</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-neon-green mb-2">Technical Testers</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Backend API endpoint validation</li>
                  <li>• Frontend UI/UX testing</li>
                  <li>• Security vulnerability assessment</li>
                  <li>• Performance and load testing</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-neon-blue mb-2">User Experience Testers</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Registration and onboarding flow</li>
                  <li>• Trading user journey testing</li>
                  <li>• Mobile responsiveness validation</li>
                  <li>• Accessibility compliance check</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-nuclear-glow mb-2">Business Testers</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Feature requirement validation</li>
                  <li>• User story scenario testing</li>
                  <li>• Compliance and regulatory check</li>
                  <li>• Documentation accuracy review</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Success Criteria */}
          <Card className="glassmorphism border-neon-purple/30">
            <CardHeader>
              <CardTitle className="text-neon-purple flex items-center space-x-2">
                <TrendingUp className="w-6 h-6" />
                <span>Success Criteria</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-neon-green mb-2">Functional Requirements</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• 99%+ uptime during testing</li>
                  <li>• All core features working</li>
                  <li>• Real wallet connections successful</li>
                  <li>• Email delivery rate >95%</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-neon-blue mb-2">Performance Requirements</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Page load times <3 seconds</li>
                  <li>• API response times <200ms</li>
                  <li>• WebSocket stable 24+ hours</li>
                  <li>• 100+ concurrent users supported</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-nuclear-glow mb-2">Security Requirements</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• No critical vulnerabilities</li>
                  <li>• SSL/TLS A+ rating</li>
                  <li>• OWASP compliance achieved</li>
                  <li>• User data properly encrypted</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Environment Information */}
        <Alert className="border-neon-blue/30 bg-neon-blue/10">
          <Info className="h-4 w-4 text-neon-blue" />
          <AlertDescription className="text-neon-blue">
            <strong>🔬 UAT Environment Information:</strong><br />
            • Backend: http://localhost:3001 (Full-featured server with Solana integration)<br />
            • Frontend: http://localhost:3000 (Next.js with comprehensive dashboard)<br />
            • Database: SQLite (Production will use PostgreSQL)<br />
            • Email: SMTP configured (Test credentials needed)<br />
            • Solana: Mainnet RPC connection active<br />
            • Trading: Demo mode (No real funds at risk)
          </AlertDescription>
        </Alert>

        <Alert className="border-neon-green/30 bg-neon-green/10">
          <CheckCircle className="h-4 w-4 text-neon-green" />
          <AlertDescription className="text-neon-green">
            <strong>✅ Ready for Testing:</strong> All systems operational and ready for comprehensive user acceptance testing.
            Connect your Phantom wallet above to begin validation of real Solana blockchain integration.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
