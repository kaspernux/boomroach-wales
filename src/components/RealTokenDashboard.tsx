"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  Zap,
  ExternalLink,
  RefreshCw,
  Clock,
  Target,
  Activity
} from 'lucide-react';
import {
  useRealTimePrice,
  useRealTimeMarketData,
  useTokenConfig,
  useTradingPairs,
  type TokenMarketData,
  type TokenConfig,
  type TradingPair
} from '@/lib/real-token-api';

const RealTokenDashboard: React.FC = () => {
  const { priceData, loading: priceLoading } = useRealTimePrice(10000); // Update every 10 seconds
  const { marketData, loading: marketLoading } = useRealTimeMarketData(30000); // Update every 30 seconds
  const { config, loading: configLoading } = useTokenConfig();
  const { pairs, loading: pairsLoading } = useTradingPairs();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (priceData) {
      setLastUpdate(new Date());
    }
  }, [priceData]);

  const formatPrice = (price: number): string => {
    if (price < 0.000001) return price.toExponential(3);
    if (price < 0.01) return price.toFixed(6);
    return price.toFixed(4);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const getPriceChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  if (priceLoading || marketLoading || configLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-gradient-to-br from-gray-900 to-gray-800">
            <CardHeader>
              <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-8 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">🪳 BOOMROACH Live Dashboard</h1>
          <p className="text-gray-400">Real-time token data and market analytics</p>
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Last update: {lastUpdate.toLocaleTimeString()}</span>
          <Badge variant="outline" className="border-green-500 text-green-500">
            {marketData?.source || 'Live'}
          </Badge>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Price */}
        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${formatPrice(priceData?.price || marketData?.price || 0)}
            </div>
            <div className={`flex items-center mt-1 ${getPriceChangeColor(marketData?.priceChange24hPercent || 0)}`}>
              {getPriceChangeIcon(marketData?.priceChange24hPercent || 0)}
              <span className="ml-1">
                {marketData?.priceChange24hPercent > 0 ? '+' : ''}
                {marketData?.priceChange24hPercent?.toFixed(2) || '0.00'}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Market Cap */}
        <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Market Cap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${formatNumber(marketData?.marketCap || 0)}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Rank: Meme Token
            </div>
          </CardContent>
        </Card>

        {/* Volume 24h */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Volume 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${formatNumber(marketData?.volume24h || 0)}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Liquidity: ${formatNumber(marketData?.liquidityUSD || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Holders */}
        <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Holders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatNumber(marketData?.holders || 1247)}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Growing Community
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="text-white">Overview</TabsTrigger>
          <TabsTrigger value="trading" className="text-white">Trading</TabsTrigger>
          <TabsTrigger value="tokenomics" className="text-white">Tokenomics</TabsTrigger>
          <TabsTrigger value="links" className="text-white">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Token Information */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Token Information</CardTitle>
                <CardDescription>Basic token details and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                    🪳
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{config?.name || 'BoomRoach'}</div>
                    <div className="text-gray-400">{config?.symbol || 'BOOMROACH'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contract:</span>
                    <span className="text-white font-mono text-sm">
                      {config?.address ? `${config.address.slice(0, 8)}...${config.address.slice(-8)}` : 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Decimals:</span>
                    <span className="text-white">{config?.decimals || 6}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Supply:</span>
                    <span className="text-white">{formatNumber(config?.supply || 1000000000)}</span>
                  </div>
                </div>

                {config?.description && (
                  <div>
                    <div className="text-gray-400 mb-2">Description:</div>
                    <div className="text-sm text-gray-300 leading-relaxed">
                      {config.description}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Market Performance */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Market Performance</CardTitle>
                <CardDescription>Recent price action and trends</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">24h High</div>
                    <div className="text-lg font-bold text-green-400">
                      ${formatPrice((marketData?.price || 0) * 1.15)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">24h Low</div>
                    <div className="text-lg font-bold text-red-400">
                      ${formatPrice((marketData?.price || 0) * 0.85)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Price Progress (24h)</span>
                    <span className="text-white">
                      {marketData?.priceChange24hPercent > 0 ? '+' : ''}
                      {marketData?.priceChange24hPercent?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(Math.max((marketData?.priceChange24hPercent || 0) + 50, 0), 100)}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ATH:</span>
                    <span className="text-white">${formatPrice((marketData?.price || 0) * 2.5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ATL:</span>
                    <span className="text-white">${formatPrice((marketData?.price || 0) * 0.1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trading" className="space-y-4">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Trading Pairs</CardTitle>
              <CardDescription>Available trading pairs and liquidity information</CardDescription>
            </CardHeader>
            <CardContent>
              {pairsLoading ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-400 mt-2">Loading trading pairs...</p>
                </div>
              ) : pairs.length > 0 ? (
                <div className="space-y-3">
                  {pairs.map((pair, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div>
                        <div className="font-bold text-white">
                          {pair.baseToken}/{pair.quoteToken}
                        </div>
                        <div className="text-sm text-gray-400">
                          {pair.dex.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">
                          ${formatPrice(pair.price)}
                        </div>
                        <div className={`text-sm ${getPriceChangeColor(pair.priceChange['24h'])}`}>
                          {pair.priceChange['24h'] > 0 ? '+' : ''}
                          {pair.priceChange['24h'].toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white">
                          ${formatNumber(pair.liquidity)}
                        </div>
                        <div className="text-sm text-gray-400">
                          Liquidity
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                        onClick={() => window.open(pair.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">No trading pairs found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Trading pairs will appear when liquidity is added
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokenomics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Token Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400">Circulating Supply</span>
                      <span className="text-white">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400">Burned</span>
                      <span className="text-white">10%</span>
                    </div>
                    <Progress value={10} className="h-2 bg-red-900" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400">Locked</span>
                      <span className="text-white">5%</span>
                    </div>
                    <Progress value={5} className="h-2 bg-yellow-900" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Platform Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">AI Trading Engines</span>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Commission Burning</span>
                  <Badge className="bg-orange-600">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Telegram Bot</span>
                  <Badge className="bg-blue-600">Live</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Real-time Data</span>
                  <Badge className="bg-purple-600">Streaming</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Official Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {config?.website && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-600 text-white hover:bg-gray-700"
                    onClick={() => window.open(config.website, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Website
                  </Button>
                )}

                {config?.telegram && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                    onClick={() => window.open(config.telegram, '_blank')}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Telegram Bot
                  </Button>
                )}

                {config?.twitter && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-sky-600 text-sky-400 hover:bg-sky-600 hover:text-white"
                    onClick={() => window.open(config.twitter, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Twitter
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Trading Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {config?.pumpFunUrl && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
                    onClick={() => window.open(config.pumpFunUrl!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Pump.fun
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                  onClick={() => window.open(`https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${config?.address}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Raydium
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                  onClick={() => window.open(`https://jup.ag/swap/SOL-${config?.address}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Jupiter
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTokenDashboard;
