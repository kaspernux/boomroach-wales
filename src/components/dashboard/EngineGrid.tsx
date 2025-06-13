"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Settings,
  Target,
  Clock,
  DollarSign,
  Activity,
  Zap,
  Shield,
  Brain,
  ArrowUpDown,
  BarChart3
} from "lucide-react";
import { useHydraBot } from "@/hydra-bot/hooks/useHydraBot";

export function EngineGrid() {
  // Consomme les engines temps réel du backend
  const { engines, loading, error, controlEngine } = useHydraBot();

  if (loading) {
    return <div>Chargement des engines...</div>;
  }
  if (error) {
    return <div className="text-red-500">Erreur : {error}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {engines.map((engine) => (
        <Card key={engine.id}>
          <CardHeader>
            <CardTitle>{engine.name}</CardTitle>
            <Badge>{engine.status}</Badge>
          </CardHeader>
          <CardContent>
            <div>Win Rate: {(engine.targetWinRate * 100).toFixed(1)}%</div>
            <div>Active Trades: {engine.realTimeMetrics.activeTrades}</div>
            <div>Pending Orders: {engine.realTimeMetrics.pendingOrders}</div>
            <div>Daily P&L: ${engine.realTimeMetrics.dailyPnL.toFixed(2)}</div>
            <Progress value={Number.parseFloat(engine.realTimeMetrics.successRate)} />
            <button
              onClick={() => controlEngine(engine.id, engine.status === "RUNNING" ? "stop" : "start")}
              className="mt-2 px-4 py-2 bg-neon-green text-white rounded"
            >
              {engine.status === "RUNNING" ? "Stop" : "Start"}
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
