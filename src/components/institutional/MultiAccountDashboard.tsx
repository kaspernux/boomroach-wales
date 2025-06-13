"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, TrendingDown, Users, Wallet, Settings, Eye, EyeOff, RefreshCw, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Account {
  id: string;
  name: string;
  type: 'trading' | 'custody' | 'institutional' | 'managed';
  owner: string;
  walletAddress: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  balance: {
    sol: number;
    boomroach: number;
    totalUsd: number;
  };
  performance: {
    totalReturn: number;
    dailyReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'custom';
  strategies: string[];
  lastActivity: number;
  permissions: {
    trading: boolean;
    withdrawal: boolean;
    reporting: boolean;
    management: boolean;
  };
  allocation: {
    cash: number;
    crypto: number;
    strategies: Record<string, number>;
  };
}

interface AccountGroup {
  id: string;
  name: string;
  description: string;
  accounts: string[];
  totalValue: number;
  performance: {
    totalReturn: number;
    volatility: number;
  };
  riskLimit: number;
  manager: string;
}

interface InstitutionalMetrics {
  totalAum: number;
  accountCount: number;
  activeStrategies: number;
  dailyVolume: number;
  averageReturn: number;
  riskUtilization: number;
  complianceScore: number;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

export default function MultiAccountDashboard() {
  // State management
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [metrics, setMetrics] = useState<InstitutionalMetrics | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'individual' | 'grouped' | 'consolidated'>('individual');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSensitive, setShowSensitive] = useState(false);

  // Performance data for charts
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [allocationData, setAllocationData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);

  /**
   * Initialize dashboard data
   */
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Simulate API calls - in production these would be real API endpoints
      await Promise.all([
        loadAccounts(),
        loadAccountGroups(),
        loadMetrics(),
        loadPerformanceData(),
        loadAllocationData(),
        loadRiskData()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAccounts = async () => {
    // Mock data - in production this would fetch from API
    const mockAccounts: Account[] = [
      {
        id: 'acc_001',
        name: 'Institutional Fund A',
        type: 'institutional',
        owner: 'Goldman Sachs',
        walletAddress: 'ABC123...XYZ789',
        status: 'active',
        balance: { sol: 1500, boomroach: 250000, totalUsd: 2750000 },
        performance: { totalReturn: 15.2, dailyReturn: 0.8, sharpeRatio: 1.8, maxDrawdown: -8.5, winRate: 72 },
        riskProfile: 'moderate',
        strategies: ['Quantum Arbitrage', 'Neural Trend', 'Grid Trading'],
        lastActivity: Date.now() - 300000,
        permissions: { trading: true, withdrawal: true, reporting: true, management: true },
        allocation: { cash: 25, crypto: 60, strategies: { 'Quantum Arbitrage': 40, 'Neural Trend': 35, 'Grid Trading': 25 } }
      },
      {
        id: 'acc_002',
        name: 'Hedge Fund Delta',
        type: 'managed',
        owner: 'Citadel Securities',
        walletAddress: 'DEF456...UVW012',
        status: 'active',
        balance: { sol: 3200, boomroach: 580000, totalUsd: 5950000 },
        performance: { totalReturn: 22.7, dailyReturn: 1.2, sharpeRatio: 2.1, maxDrawdown: -12.3, winRate: 68 },
        riskProfile: 'aggressive',
        strategies: ['Momentum Scalper', 'Mean Reversion', 'Sentiment Analyzer'],
        lastActivity: Date.now() - 150000,
        permissions: { trading: true, withdrawal: false, reporting: true, management: false },
        allocation: { cash: 15, crypto: 70, strategies: { 'Momentum Scalper': 45, 'Mean Reversion': 30, 'Sentiment Analyzer': 25 } }
      },
      {
        id: 'acc_003',
        name: 'Conservative Portfolio',
        type: 'custody',
        owner: 'BlackRock',
        walletAddress: 'GHI789...RST345',
        status: 'active',
        balance: { sol: 800, boomroach: 150000, totalUsd: 1425000 },
        performance: { totalReturn: 8.9, dailyReturn: 0.3, sharpeRatio: 1.2, maxDrawdown: -4.2, winRate: 78 },
        riskProfile: 'conservative',
        strategies: ['DCA Bot', 'Grid Trading'],
        lastActivity: Date.now() - 600000,
        permissions: { trading: false, withdrawal: true, reporting: true, management: false },
        allocation: { cash: 40, crypto: 50, strategies: { 'DCA Bot': 60, 'Grid Trading': 40 } }
      }
    ];

    setAccounts(mockAccounts);
  };

  const loadAccountGroups = async () => {
    const mockGroups: AccountGroup[] = [
      {
        id: 'group_001',
        name: 'High Performance Group',
        description: 'Aggressive trading strategies for maximum returns',
        accounts: ['acc_001', 'acc_002'],
        totalValue: 8700000,
        performance: { totalReturn: 18.95, volatility: 15.2 },
        riskLimit: 0.15,
        manager: 'Trading Team Alpha'
      },
      {
        id: 'group_002',
        name: 'Conservative Holdings',
        description: 'Low-risk, stable growth investments',
        accounts: ['acc_003'],
        totalValue: 1425000,
        performance: { totalReturn: 8.9, volatility: 6.8 },
        riskLimit: 0.05,
        manager: 'Risk Management Team'
      }
    ];

    setAccountGroups(mockGroups);
  };

  const loadMetrics = async () => {
    const mockMetrics: InstitutionalMetrics = {
      totalAum: 10125000,
      accountCount: 3,
      activeStrategies: 8,
      dailyVolume: 2450000,
      averageReturn: 15.6,
      riskUtilization: 68,
      complianceScore: 98
    };

    setMetrics(mockMetrics);
  };

  const loadPerformanceData = async () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      totalValue: 10000000 + (Math.random() - 0.5) * 2000000 + i * 50000,
      returns: (Math.random() - 0.5) * 4,
      sharpe: 1.2 + (Math.random() - 0.5) * 0.8
    }));

    setPerformanceData(data);
  };

  const loadAllocationData = async () => {
    const data = [
      { name: 'Cash', value: 25, color: COLORS[0] },
      { name: 'Crypto Assets', value: 60, color: COLORS[1] },
      { name: 'Active Strategies', value: 15, color: COLORS[2] }
    ];

    setAllocationData(data);
  };

  const loadRiskData = async () => {
    const data = accounts.map((account, index) => ({
      name: account.name,
      currentRisk: Math.abs(account.performance.maxDrawdown),
      riskLimit: 15 + index * 5,
      utilization: (Math.abs(account.performance.maxDrawdown) / (15 + index * 5)) * 100
    }));

    setRiskData(data);
  };

  /**
   * Filter and search functionality
   */
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.walletAddress.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || account.type === filterType;
    const matchesStatus = filterStatus === 'all' || account.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  /**
   * Account management functions
   */
  const handleAccountAction = useCallback((accountId: string, action: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    switch (action) {
      case 'suspend':
        setAccounts(prev => prev.map(acc =>
          acc.id === accountId ? { ...acc, status: 'suspended' as const } : acc
        ));
        toast.success(`Account ${account.name} suspended`);
        break;

      case 'activate':
        setAccounts(prev => prev.map(acc =>
          acc.id === accountId ? { ...acc, status: 'active' as const } : acc
        ));
        toast.success(`Account ${account.name} activated`);
        break;

      case 'export':
        downloadAccountReport(accountId);
        break;

      default:
        console.log(`Action ${action} for account ${accountId}`);
    }
  }, [accounts]);

  const downloadAccountReport = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    // Simulate report generation
    const reportData = {
      account: account.name,
      generatedAt: new Date().toISOString(),
      performance: account.performance,
      balance: account.balance,
      allocation: account.allocation
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account.name.replace(/\s+/g, '_')}_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Report downloaded successfully');
  };

  const handleBulkAction = (action: string) => {
    if (selectedAccounts.length === 0) {
      toast.error('Please select accounts first');
      return;
    }

    switch (action) {
      case 'export_all':
        selectedAccounts.forEach(accountId => downloadAccountReport(accountId));
        break;

      case 'update_risk':
        toast.info('Risk profile update feature coming soon');
        break;

      default:
        console.log(`Bulk action ${action} for accounts:`, selectedAccounts);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Loading institutional dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Account Management</h1>
          <p className="text-gray-600 mt-1">Institutional trading platform dashboard</p>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSensitive(!showSensitive)}
          >
            {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showSensitive ? 'Hide' : 'Show'} Sensitive
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {showSensitive ? `$${(metrics.totalAum / 1000000).toFixed(1)}M` : '****'}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.accountCount} active accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Return</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{metrics.averageReturn}%
              </div>
              <p className="text-xs text-muted-foreground">
                30-day performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Utilization</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.riskUtilization}%
              </div>
              <p className="text-xs text-muted-foreground">
                Of allocated risk budget
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.complianceScore}%
              </div>
              <p className="text-xs text-muted-foreground">
                Regulatory compliance
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual">Individual Accounts</TabsTrigger>
          <TabsTrigger value="grouped">Account Groups</TabsTrigger>
          <TabsTrigger value="consolidated">Consolidated View</TabsTrigger>
        </TabsList>

        {/* Individual Accounts View */}
        <TabsContent value="individual" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>Account Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="type-filter">Account Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="trading">Trading</SelectItem>
                      <SelectItem value="custody">Custody</SelectItem>
                      <SelectItem value="institutional">Institutional</SelectItem>
                      <SelectItem value="managed">Managed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end space-x-2">
                  <Button
                    onClick={() => handleBulkAction('export_all')}
                    disabled={selectedAccounts.length === 0}
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accounts List */}
          <div className="grid gap-6">
            {filteredAccounts.map((account) => (
              <Card key={account.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccounts([...selectedAccounts, account.id]);
                          } else {
                            setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                          }
                        }}
                        className="rounded"
                      />
                      <div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        <CardDescription>
                          {account.owner} • {account.type} •
                          {showSensitive ? account.walletAddress : '****...****'}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                        {account.status}
                      </Badge>
                      <Badge variant="outline">
                        {account.riskProfile}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Balance Information */}
                    <div>
                      <h4 className="font-semibold mb-2">Balance</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Total USD:</span>
                          <span className="font-medium">
                            {showSensitive ? `$${account.balance.totalUsd.toLocaleString()}` : '****'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>SOL:</span>
                          <span>{showSensitive ? account.balance.sol.toLocaleString() : '****'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>BOOMROACH:</span>
                          <span>{showSensitive ? account.balance.boomroach.toLocaleString() : '****'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                      <h4 className="font-semibold mb-2">Performance</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Total Return:</span>
                          <span className={`font-medium ${account.performance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {account.performance.totalReturn >= 0 ? '+' : ''}{account.performance.totalReturn}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sharpe Ratio:</span>
                          <span className="font-medium">{account.performance.sharpeRatio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Win Rate:</span>
                          <span className="font-medium">{account.performance.winRate}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <h4 className="font-semibold mb-2">Actions</h4>
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleAccountAction(account.id, 'export')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>

                        {account.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => handleAccountAction(account.id, 'suspend')}
                          >
                            Suspend Account
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            className="w-full"
                            onClick={() => handleAccountAction(account.id, 'activate')}
                          >
                            Activate Account
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Account Groups View */}
        <TabsContent value="grouped" className="space-y-6">
          <div className="grid gap-6">
            {accountGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Group Metrics</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Total Value:</span>
                          <span className="font-medium">
                            {showSensitive ? `$${(group.totalValue / 1000000).toFixed(1)}M` : '****'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Accounts:</span>
                          <span className="font-medium">{group.accounts.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Manager:</span>
                          <span className="font-medium">{group.manager}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Performance</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Total Return:</span>
                          <span className={`font-medium ${group.performance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {group.performance.totalReturn >= 0 ? '+' : ''}{group.performance.totalReturn}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Volatility:</span>
                          <span className="font-medium">{group.performance.volatility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Limit:</span>
                          <span className="font-medium">{group.riskLimit * 100}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Member Accounts</h4>
                      <div className="space-y-1">
                        {group.accounts.map(accountId => {
                          const account = accounts.find(acc => acc.id === accountId);
                          return account ? (
                            <div key={accountId} className="text-sm">
                              <Badge variant="outline" className="text-xs">
                                {account.name}
                              </Badge>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Consolidated View */}
        <TabsContent value="consolidated" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
                <CardDescription>30-day consolidated performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="totalValue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Asset Allocation */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Current portfolio distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Analysis</CardTitle>
                <CardDescription>Risk utilization by account</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="utilization" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest account activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accounts.slice(0, 3).map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-gray-500">
                          Last activity: {new Date(account.lastActivity).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                        {account.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
