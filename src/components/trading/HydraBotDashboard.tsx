"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHydraBot } from '@/hydra-bot/hooks/useHydraBot';

export default function HydraBotDashboard() {
  // Consomme les données temps réel du backend
  const { engines, engineStats, signals, portfolio, recentTrades, loading, error } = useHydraBot();

  if (loading) {
    return <div>Chargement des données HydraBot...</div>;
  }
  if (error) {
    return <div className="text-red-500">Erreur : {error}</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="engines">
        <TabsList>
          <TabsTrigger value="engines">AI Engines</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        </TabsList>

        <TabsContent value="engines">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {engines.map(engine => (
              <Card key={engine.id}>
                <CardHeader>
                  <CardTitle>{engine.name}</CardTitle>
                  <Badge>{engine.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div>Win Rate: {engine.winRate}%</div>
                  <div>Trades: {engine.totalTrades}</div>
                  <div>Profit: ${engine.profit.toFixed(2)}</div>
                  <Progress value={engine.winRate} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="signals">
          <div>
            {signals.map(signal => (
              <div key={signal.id} className="mb-2">
                <Badge>{signal.type}</Badge> {signal.tokenSymbol} @ ${signal.price}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="portfolio">
          <div>
            <div>Total Value: ${portfolio?.totalValue?.toLocaleString() ?? '0'}</div>
            <div>Positions: {portfolio?.positions?.length ?? 0}</div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
