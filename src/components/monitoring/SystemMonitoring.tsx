"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Memory,
  Monitor,
  Network,
  RefreshCw,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Wifi,
  Zap,
  BarChart3,
  PieChart,
  LineChart,
  AlertCircle,
  Info,
  Settings,
  Download,
  Eye,
  Filter,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
    swap: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
    iops: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    latency: number;
  };
  database: {
    connections: number;
    queries: number;
    avgResponseTime: number;
    cacheHitRatio: number;
  };
}

interface ServiceHealth {
  name: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
  uptime: number;
  responseTime: number;
  lastCheck: number;
  version: string;
  dependencies: string[];
  errorRate: number;
}

interface Alert {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: number;
  service: string;
  acknowledged: boolean;
  resolved: boolean;
}

interface UserMetrics {
  activeUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  conversionRate: number;
}

const MOCK_METRICS: SystemMetrics = {
  timestamp: Date.now(),
  cpu: {
    usage: 45.2,
    cores: 8,
    temperature: 62,
    load: [0.45, 0.38, 0.52, 0.41]
  },
  memory: {
    used: 12.8,
    total: 32.0,
    usage: 40.0,
    swap: 2.1
  },
  disk: {
    used: 256,
    total: 1024,
    usage: 25.0,
    iops: 1250
  },
  network: {
    bytesIn: 1250000,
    bytesOut: 890000,
    packetsIn: 5420,
    packetsOut: 3890,
    latency: 12
  },
  database: {
    connections: 45,
    queries: 1250,
    avgResponseTime: 8.5,
    cacheHitRatio: 94.2
  }
};

const MOCK_SERVICES: ServiceHealth[] = [
  {
    name: 'API Gateway',
    status: 'HEALTHY',
    uptime: 99.9,
    responseTime: 125,
    lastCheck: Date.now(),
    version: '2.1.4',
    dependencies: ['Database', 'Redis Cache'],
    errorRate: 0.02
  },
  {
    name: 'AI Engine Coordinator',
    status: 'HEALTHY',
    uptime: 99.7,
    responseTime: 89,
    lastCheck: Date.now(),
    version: '1.8.2',
    dependencies: ['TensorFlow Service', 'Market Data Feed'],
    errorRate: 0.05
  },
  {
    name: 'Solana RPC Node',
    status: 'WARNING',
    uptime: 98.5,
    responseTime: 234,
    lastCheck: Date.now(),
    version: '1.16.7',
    dependencies: ['Solana Network'],
    errorRate: 1.2
  },
  {
    name: 'Database Cluster',
    status: 'HEALTHY',
    uptime: 99.95,
    responseTime: 12,
    lastCheck: Date.now(),
    version: '14.8',
    dependencies: [],
    errorRate: 0.01
  },
  {
    name: 'Redis Cache',
    status: 'HEALTHY',
    uptime: 99.8,
    responseTime: 3,
    lastCheck: Date.now(),
    version: '7.0.11',
    dependencies: [],
    errorRate: 0.03
  },
  {
    name: 'WebSocket Service',
    status: 'CRITICAL',
    uptime: 95.2,
    responseTime: 456,
    lastCheck: Date.now(),
    version: '3.2.1',
    dependencies: ['Redis Cache', 'API Gateway'],
    errorRate: 4.7
  }
];

const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert_001',
    type: 'WARNING',
    title: 'High Response Time',
    message: 'Solana RPC Node response time exceeding 200ms threshold',
    timestamp: Date.now() - 300000,
    service: 'Solana RPC Node',
    acknowledged: false,
    resolved: false
  },
  {
    id: 'alert_002',
    type: 'CRITICAL',
    title: 'Service Degradation',
    message: 'WebSocket Service experiencing high error rate (4.7%)',
    timestamp: Date.now() - 600000,
    service: 'WebSocket Service',
    acknowledged: true,
    resolved: false
  },
  {
    id: 'alert_003',
    type: 'INFO',
    title: 'System Update',
    message: 'Scheduled maintenance completed successfully',
    timestamp: Date.now() - 1800000,
    service: 'System',
    acknowledged: true,
    resolved: true
  }
];

const MOCK_USER_METRICS: UserMetrics = {
  activeUsers: 1247,
  totalSessions: 3892,
  avgSessionDuration: 18.5,
  pageViews: 15420,
  uniqueVisitors: 2184,
  bounceRate: 12.8,
  conversionRate: 4.2
};

export default function SystemMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics>(MOCK_METRICS);
  const [services, setServices] = useState<ServiceHealth[]>(MOCK_SERVICES);
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [userMetrics, setUserMetrics] = useState<UserMetrics>(MOCK_USER_METRICS);
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Simulate real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate metric fluctuations
      setMetrics(prev => ({
        ...prev,
        timestamp: Date.now(),
        cpu: {
          ...prev.cpu,
          usage: Math.max(0, Math.min(100, prev.cpu.usage + (Math.random() - 0.5) * 10))
        },
        memory: {
          ...prev.memory,
          usage: Math.max(0, Math.min(100, prev.memory.usage + (Math.random() - 0.5) * 5))
        },
        network: {
          ...prev.network,
          latency: Math.max(1, prev.network.latency + (Math.random() - 0.5) * 5)
        }
      }));

      setLastUpdated(Date.now());
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    toast.success('Alert acknowledged');
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
    toast.success('Alert resolved');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600 bg-green-100';
      case 'WARNING': return 'text-yellow-600 bg-yellow-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'DOWN': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'INFO': return 'text-blue-600 bg-blue-100';
      case 'WARNING': return 'text-yellow-600 bg-yellow-100';
      case 'ERROR': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const criticalAlerts = activeAlerts.filter(alert => alert.type === 'CRITICAL');
  const warningAlerts = activeAlerts.filter(alert => alert.type === 'WARNING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time system health, performance metrics, and alerts
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            <Clock className="w-3 h-3 mr-1" />
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </Badge>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">5 minutes</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="6h">6 hours</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 text-green-700' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto Refresh' : 'Manual'}
          </Button>

          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      {activeAlerts.length > 0 && (
        <Alert className={criticalAlerts.length > 0 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {criticalAlerts.length > 0 && (
                  <span className="text-red-700 font-medium">
                    {criticalAlerts.length} critical alert{criticalAlerts.length !== 1 ? 's' : ''}
                  </span>
                )}
                {criticalAlerts.length > 0 && warningAlerts.length > 0 && <span className="text-gray-500"> • </span>}
                {warningAlerts.length > 0 && (
                  <span className="text-yellow-700 font-medium">
                    {warningAlerts.length} warning{warningAlerts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
              <Button variant="outline" size="sm">
                View All Alerts
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CPU Usage</p>
                <p className="text-2xl font-bold">{metrics.cpu.usage.toFixed(1)}%</p>
              </div>
              <Cpu className="w-8 h-8 text-blue-600" />
            </div>
            <Progress value={metrics.cpu.usage} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {metrics.cpu.cores} cores • {metrics.cpu.temperature}°C
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <p className="text-2xl font-bold">{metrics.memory.usage.toFixed(1)}%</p>
              </div>
              <Memory className="w-8 h-8 text-green-600" />
            </div>
            <Progress value={metrics.memory.usage} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {metrics.memory.used.toFixed(1)} GB / {metrics.memory.total.toFixed(1)} GB
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disk Usage</p>
                <p className="text-2xl font-bold">{metrics.disk.usage.toFixed(1)}%</p>
              </div>
              <HardDrive className="w-8 h-8 text-purple-600" />
            </div>
            <Progress value={metrics.disk.usage} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {metrics.disk.used} GB / {metrics.disk.total} GB
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Network Latency</p>
                <p className="text-2xl font-bold">{metrics.network.latency.toFixed(0)}ms</p>
              </div>
              <Network className="w-8 h-8 text-orange-600" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <ArrowDown className="w-3 h-3" />
                {formatBytes(metrics.network.bytesIn)}
              </span>
              <span className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                {formatBytes(metrics.network.bytesOut)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Services */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Service Health
              </CardTitle>
              <CardDescription>
                Current status and health metrics for all system services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${
                          service.status === 'HEALTHY' ? 'bg-green-500' :
                          service.status === 'WARNING' ? 'bg-yellow-500' :
                          service.status === 'CRITICAL' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />

                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>v{service.version}</span>
                            <span>Uptime: {formatUptime(service.uptime)}</span>
                            <span>Response: {service.responseTime}ms</span>
                            <span>Error Rate: {service.errorRate.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(service.status)}>
                          {service.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>

                    {service.dependencies.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-600 mb-2">Dependencies:</p>
                        <div className="flex flex-wrap gap-2">
                          {service.dependencies.map((dep) => (
                            <Badge key={dep} variant="secondary" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">CPU Usage</span>
                      <span className="text-sm text-gray-600">{metrics.cpu.usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.cpu.usage} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm text-gray-600">{metrics.memory.usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.memory.usage} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Disk Usage</span>
                      <span className="text-sm text-gray-600">{metrics.disk.usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.disk.usage} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Connections</span>
                    <span className="font-medium">{metrics.database.connections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Queries/sec</span>
                    <span className="font-medium">{metrics.database.queries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Response Time</span>
                    <span className="font-medium">{metrics.database.avgResponseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cache Hit Ratio</span>
                    <span className="font-medium text-green-600">
                      {metrics.database.cacheHitRatio.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                System Alerts ({activeAlerts.length})
              </CardTitle>
              <CardDescription>
                Recent alerts and notifications from system monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg ${
                      alert.resolved ? 'bg-gray-50 opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {alert.type === 'CRITICAL' && <AlertCircle className="w-4 h-4 text-red-600" />}
                          {alert.type === 'WARNING' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                          {alert.type === 'ERROR' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                          {alert.type === 'INFO' && <Info className="w-4 h-4 text-blue-600" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{alert.title}</h3>
                            <Badge className={getAlertColor(alert.type)}>
                              {alert.type}
                            </Badge>
                            {alert.acknowledged && (
                              <Badge variant="outline" className="text-xs">
                                Acknowledged
                              </Badge>
                            )}
                            {alert.resolved && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                Resolved
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-2">{alert.message}</p>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Service: {alert.service}</span>
                            <span>Time: {new Date(alert.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {!alert.resolved && (
                        <div className="flex items-center gap-2">
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Analytics */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold">{userMetrics.activeUsers.toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-xs text-green-600 mt-2">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  +12% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold">{userMetrics.totalSessions.toLocaleString()}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xs text-green-600 mt-2">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  +8% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Session</p>
                    <p className="text-2xl font-bold">{userMetrics.avgSessionDuration.toFixed(1)}m</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-xs text-red-600 mt-2">
                  <TrendingDown className="w-3 h-3 inline mr-1" />
                  -2% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold">{userMetrics.conversionRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-xs text-green-600 mt-2">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  +5% from yesterday
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Page Views</span>
                      <span className="text-sm text-gray-600">{userMetrics.pageViews.toLocaleString()}</span>
                    </div>
                    <Progress value={75} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Unique Visitors</span>
                      <span className="text-sm text-gray-600">{userMetrics.uniqueVisitors.toLocaleString()}</span>
                    </div>
                    <Progress value={60} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Bounce Rate</span>
                      <span className="text-sm text-gray-600">{userMetrics.bounceRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={userMetrics.bounceRate} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Top Pages</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>/dashboard</span>
                      <span className="text-gray-600">2,341 views</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>/trading</span>
                      <span className="text-gray-600">1,892 views</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>/portfolio</span>
                      <span className="text-gray-600">1,456 views</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>/analytics</span>
                      <span className="text-gray-600">987 views</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                System Logs
              </CardTitle>
              <CardDescription>
                Recent system logs and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                <div className="space-y-1">
                  <div className="text-green-400">[2024-01-25 15:42:33] INFO: AI Engine started successfully</div>
                  <div className="text-blue-400">[2024-01-25 15:42:34] DEBUG: Database connection established</div>
                  <div className="text-green-400">[2024-01-25 15:42:35] INFO: WebSocket server listening on port 8080</div>
                  <div className="text-yellow-400">[2024-01-25 15:42:36] WARN: High memory usage detected (85%)</div>
                  <div className="text-green-400">[2024-01-25 15:42:37] INFO: Trade executed successfully</div>
                  <div className="text-blue-400">[2024-01-25 15:42:38] DEBUG: Cache cleared automatically</div>
                  <div className="text-red-400">[2024-01-25 15:42:39] ERROR: Failed to connect to external API</div>
                  <div className="text-green-400">[2024-01-25 15:42:40] INFO: API connection restored</div>
                  <div className="text-blue-400">[2024-01-25 15:42:41] DEBUG: Background job completed</div>
                  <div className="text-green-400">[2024-01-25 15:42:42] INFO: System health check passed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
