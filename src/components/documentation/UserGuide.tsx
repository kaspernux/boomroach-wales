"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import {
  BookOpen,
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Search,
  Download,
  ExternalLink,
  Lightbulb,
  AlertTriangle,
  Info,
  Zap,
  Brain,
  TrendingUp,
  Grid3X3,
  Activity,
  BarChart3,
  MessageSquare,
  DollarSign,
  Wallet,
  Shield,
  Settings,
  Users,
  Building2,
  Globe,
  Video,
  FileText,
  Code,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageCircle
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  description: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedTime: number; // minutes
  topics: string[];
  icon: any;
  content: GuideContent[];
}

interface GuideContent {
  type: 'text' | 'code' | 'image' | 'video' | 'interactive' | 'warning' | 'tip';
  content: string;
  code?: string;
  language?: string;
  imageUrl?: string;
  videoUrl?: string;
  interactive?: any;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedTime: number;
  prerequisites: string[];
  tags: string[];
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action: string;
  target?: string;
  validation?: () => boolean;
  tip?: string;
  warning?: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of BoomRoach Wales platform',
    difficulty: 'BEGINNER',
    estimatedTime: 15,
    topics: ['Account Setup', 'Wallet Connection', 'Basic Navigation'],
    icon: BookOpen,
    content: [
      {
        type: 'text',
        content: 'Welcome to BoomRoach Wales, the most advanced AI-powered trading platform on Solana. This guide will help you get started with your trading journey.'
      },
      {
        type: 'warning',
        content: 'Before you begin trading, ensure you have at least 1,000 BOOMROACH tokens in your wallet. This is required for all trading activities.'
      },
      {
        type: 'text',
        content: 'Step 1: Connect Your Solana Wallet'
      },
      {
        type: 'code',
        content: 'Click the "Connect Wallet" button in the top-right corner and select your preferred wallet:',
        code: `Supported Wallets:
• Phantom Wallet (Recommended)
• Solflare Wallet
• Torus Wallet`,
        language: 'text'
      },
      {
        type: 'tip',
        content: 'Make sure your wallet is set to the correct Solana network (Mainnet) before connecting.'
      }
    ]
  },
  {
    id: 'ai-engines',
    title: 'AI Trading Engines',
    description: 'Understanding our 8 AI-powered trading strategies',
    difficulty: 'INTERMEDIATE',
    estimatedTime: 25,
    topics: ['Engine Types', 'Configuration', 'Performance Monitoring'],
    icon: Brain,
    content: [
      {
        type: 'text',
        content: 'BoomRoach Wales features 8 sophisticated AI trading engines, each designed for different market conditions and trading styles.'
      },
      {
        type: 'text',
        content: '1. Quantum Arbitrage Engine'
      },
      {
        type: 'code',
        content: 'Exploits price differences across multiple DEXs with MEV protection',
        code: `Features:
• Cross-DEX arbitrage detection
• MEV protection mechanisms
• Real-time opportunity scanning
• Risk-adjusted position sizing
• Average profit: 2-5% per trade`,
        language: 'text'
      },
      {
        type: 'text',
        content: '2. Neural Trend Rider Engine'
      },
      {
        type: 'code',
        content: 'LSTM-based trend detection and following system',
        code: `Features:
• Deep learning trend analysis
• Multi-timeframe signal generation
• Adaptive risk management
• 87% accuracy rate
• Best for trending markets`,
        language: 'text'
      }
    ]
  },
  {
    id: 'wallet-management',
    title: 'Wallet & Token Management',
    description: 'Managing your BOOMROACH tokens and trading balances',
    difficulty: 'BEGINNER',
    estimatedTime: 10,
    topics: ['Token Requirements', 'Balance Checking', 'Profit Conversion'],
    icon: Wallet,
    content: [
      {
        type: 'text',
        content: 'Your wallet is the heart of your trading activities on BoomRoach Wales. Understanding how to manage your tokens is crucial.'
      },
      {
        type: 'warning',
        content: 'Always maintain a minimum of 1,000 BOOMROACH tokens to continue trading. Falling below this threshold will pause all trading activities.'
      },
      {
        type: 'text',
        content: 'Automatic Profit Conversion'
      },
      {
        type: 'code',
        content: 'All trading profits are automatically converted to BOOMROACH tokens and stored in your wallet.',
        code: `Conversion Process:
1. Trade executes successfully
2. Profit calculated in USD
3. Converted to BOOMROACH at current rate
4. Automatically deposited to your wallet
5. Balance updated in real-time`,
        language: 'text'
      }
    ]
  },
  {
    id: 'trading-strategies',
    title: 'Trading Strategies',
    description: 'Deep dive into each trading strategy and when to use them',
    difficulty: 'ADVANCED',
    estimatedTime: 45,
    topics: ['Strategy Selection', 'Risk Management', 'Portfolio Allocation'],
    icon: TrendingUp,
    content: [
      {
        type: 'text',
        content: 'Each AI engine is designed for specific market conditions. Understanding when and how to use each strategy is key to maximizing profits.'
      },
      {
        type: 'text',
        content: 'Market Regime Analysis'
      },
      {
        type: 'code',
        content: 'The platform automatically detects market regimes and adjusts strategy allocation',
        code: `Market Regimes:
• BULL MARKET: High momentum, trend-following strategies
• BEAR MARKET: Mean reversion, defensive strategies
• SIDEWAYS: Grid trading, arbitrage opportunities
• HIGH VOLATILITY: Scalping, sentiment analysis
• LOW VOLATILITY: DCA, conservative strategies`,
        language: 'text'
      }
    ]
  },
  {
    id: 'risk-management',
    title: 'Risk Management',
    description: 'Understanding and controlling your trading risk',
    difficulty: 'INTERMEDIATE',
    estimatedTime: 20,
    topics: ['Position Sizing', 'Stop Losses', 'Diversification'],
    icon: Shield,
    content: [
      {
        type: 'text',
        content: 'Effective risk management is crucial for long-term trading success. Our platform includes multiple layers of risk protection.'
      },
      {
        type: 'warning',
        content: 'Never risk more than you can afford to lose. Start with small position sizes and gradually increase as you gain experience.'
      },
      {
        type: 'text',
        content: 'Automated Risk Controls'
      },
      {
        type: 'code',
        content: 'Built-in risk management features protect your capital',
        code: `Risk Controls:
• Maximum 2% risk per trade
• Portfolio-wide stop loss at 10%
• Maximum 5 concurrent positions
• Automatic position sizing based on volatility
• Real-time drawdown monitoring`,
        language: 'text'
      }
    ]
  },
  {
    id: 'institutional-features',
    title: 'Institutional Features',
    description: 'Advanced features for professional traders and institutions',
    difficulty: 'ADVANCED',
    estimatedTime: 30,
    topics: ['Multi-Account Management', 'Reporting', 'API Access'],
    icon: Building2,
    content: [
      {
        type: 'text',
        content: 'Professional traders and institutions can access advanced portfolio management and reporting features.'
      },
      {
        type: 'text',
        content: 'Multi-Account Dashboard'
      },
      {
        type: 'code',
        content: 'Manage multiple trading accounts from a single interface',
        code: `Features:
• Consolidated portfolio view
• Individual account performance tracking
• Risk allocation across accounts
• Automated reporting and compliance
• Custom permission management`,
        language: 'text'
      }
    ]
  }
];

const TUTORIALS: Tutorial[] = [
  {
    id: 'first-trade',
    title: 'Your First Trade',
    description: 'Step-by-step guide to executing your first trade',
    category: 'Getting Started',
    difficulty: 'BEGINNER',
    estimatedTime: 10,
    prerequisites: ['Connected wallet', '1000+ BOOMROACH tokens'],
    tags: ['trading', 'beginner', 'setup'],
    steps: [
      {
        id: 'step1',
        title: 'Navigate to Trading Dashboard',
        description: 'Go to the main trading dashboard to access all AI engines',
        action: 'Click on "Trading" in the main navigation menu',
        tip: 'The trading dashboard shows all 8 AI engines and their current status'
      },
      {
        id: 'step2',
        title: 'Check Wallet Connection',
        description: 'Ensure your wallet is connected and has sufficient BOOMROACH tokens',
        action: 'Verify the wallet status indicator shows "Connected" with green icon',
        validation: () => true, // In real app, check actual wallet status
        warning: 'You need at least 1,000 BOOMROACH tokens to start trading'
      },
      {
        id: 'step3',
        title: 'Select Trading Engine',
        description: 'Choose an AI engine based on current market conditions',
        action: 'Click on an AI engine card to view details and activate',
        tip: 'Start with the Neural Trend Rider for general market conditions'
      },
      {
        id: 'step4',
        title: 'Configure Strategy',
        description: 'Set your risk parameters and position size',
        action: 'Adjust the risk slider and confirm your settings',
        tip: 'Start with conservative settings (1-2% risk per trade)'
      },
      {
        id: 'step5',
        title: 'Activate Engine',
        description: 'Start the AI engine and monitor its performance',
        action: 'Click "Activate" button to start automated trading',
        tip: 'You can pause or stop the engine at any time'
      }
    ]
  },
  {
    id: 'setup-portfolio',
    title: 'Setting Up Your Portfolio',
    description: 'Configure multiple AI engines for diversified trading',
    category: 'Portfolio Management',
    difficulty: 'INTERMEDIATE',
    estimatedTime: 20,
    prerequisites: ['Basic trading experience', 'Understanding of AI engines'],
    tags: ['portfolio', 'diversification', 'advanced'],
    steps: [
      {
        id: 'step1',
        title: 'Access Portfolio Settings',
        description: 'Navigate to the portfolio management section',
        action: 'Click on "Portfolio" in the main menu'
      },
      {
        id: 'step2',
        title: 'Set Allocation Strategy',
        description: 'Decide how to distribute your capital across engines',
        action: 'Use the allocation sliders to set percentages for each engine',
        tip: 'A balanced portfolio might use 20-30% per engine across 3-4 engines'
      },
      {
        id: 'step3',
        title: 'Configure Risk Limits',
        description: 'Set portfolio-wide risk parameters',
        action: 'Set maximum drawdown and daily loss limits',
        warning: 'Never set risk limits higher than you can afford to lose'
      },
      {
        id: 'step4',
        title: 'Review and Activate',
        description: 'Review your settings and start the portfolio',
        action: 'Click "Start Portfolio" to begin multi-engine trading'
      }
    ]
  }
];

export default function UserGuide() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [tutorialProgress, setTutorialProgress] = useState<Map<string, number>>(new Map());

  const filteredSections = GUIDE_SECTIONS.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTutorials = TUTORIALS.filter(tutorial =>
    tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutorial.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutorial.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const startTutorial = (tutorial: Tutorial) => {
    setActiveTutorial(tutorial);
    setCurrentStep(0);
    toast.success(`Started tutorial: ${tutorial.title}`);
  };

  const nextStep = () => {
    if (activeTutorial && currentStep < activeTutorial.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeStep = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));

    if (activeTutorial) {
      const newProgress = ((currentStep + 1) / activeTutorial.steps.length) * 100;
      setTutorialProgress(prev => new Map([...prev, [activeTutorial.id, newProgress]]));
    }

    toast.success('Step completed!');

    // Auto-advance to next step
    setTimeout(nextStep, 1000);
  };

  const finishTutorial = () => {
    if (activeTutorial) {
      setTutorialProgress(prev => new Map([...prev, [activeTutorial.id, 100]]));
      toast.success(`Tutorial completed: ${activeTutorial.title}`);
    }
    setActiveTutorial(null);
    setCurrentStep(0);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderContent = (content: GuideContent) => {
    switch (content.type) {
      case 'text':
        return <p className="text-gray-700 leading-relaxed">{content.content}</p>;

      case 'code':
        return (
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
            {content.content && <p className="mb-2 text-gray-300">{content.content}</p>}
            <pre className="text-sm overflow-x-auto">
              <code>{content.code}</code>
            </pre>
          </div>
        );

      case 'warning':
        return (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              {content.content}
            </AlertDescription>
          </Alert>
        );

      case 'tip':
        return (
          <Alert className="border-blue-200 bg-blue-50">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription className="text-blue-700">
              <strong>Tip:</strong> {content.content}
            </AlertDescription>
          </Alert>
        );

      default:
        return <p>{content.content}</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Guide & Documentation</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive guides, tutorials, and documentation for BoomRoach Wales
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline">
            <ExternalLink className="w-4 h-4 mr-2" />
            API Docs
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search guides and tutorials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tutorial Modal */}
      {activeTutorial && (
        <Card className="fixed inset-4 z-50 shadow-2xl overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  {activeTutorial.title}
                </CardTitle>
                <CardDescription className="text-purple-100">
                  Step {currentStep + 1} of {activeTutorial.steps.length}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTutorial(null)}
                className="text-white hover:bg-white/20"
              >
                ×
              </Button>
            </div>
            <Progress
              value={((currentStep + 1) / activeTutorial.steps.length) * 100}
              className="mt-4"
            />
          </CardHeader>

          <CardContent className="p-6">
            {activeTutorial.steps[currentStep] && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {activeTutorial.steps[currentStep].title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {activeTutorial.steps[currentStep].description}
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-medium text-blue-900">Action Required:</p>
                    <p className="text-blue-700">{activeTutorial.steps[currentStep].action}</p>
                  </div>

                  {activeTutorial.steps[currentStep].tip && (
                    <Alert className="mt-4 border-green-200 bg-green-50">
                      <Lightbulb className="h-4 w-4" />
                      <AlertDescription className="text-green-700">
                        <strong>Tip:</strong> {activeTutorial.steps[currentStep].tip}
                      </AlertDescription>
                    </Alert>
                  )}

                  {activeTutorial.steps[currentStep].warning && (
                    <Alert className="mt-4 border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-red-700">
                        <strong>Warning:</strong> {activeTutorial.steps[currentStep].warning}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentStep === activeTutorial.steps.length - 1 ? (
                      <Button
                        onClick={finishTutorial}
                        className="bg-gradient-to-r from-green-600 to-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Tutorial
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => completeStep(activeTutorial.steps[currentStep].id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Complete
                        </Button>
                        <Button onClick={nextStep}>
                          Next
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="guides" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="guides">User Guides</TabsTrigger>
          <TabsTrigger value="tutorials">Interactive Tutorials</TabsTrigger>
          <TabsTrigger value="api">API Reference</TabsTrigger>
        </TabsList>

        {/* User Guides */}
        <TabsContent value="guides" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Guide Sections</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {filteredSections.map((section) => {
                      const IconComponent = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full text-left p-3 hover:bg-gray-50 border-r-2 transition-colors ${
                            activeSection === section.id
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-4 h-4" />
                            <div>
                              <p className="font-medium text-sm">{section.title}</p>
                              <p className="text-xs text-gray-500">{section.estimatedTime} min</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {filteredSections.map((section) => {
                if (section.id !== activeSection) return null;

                const IconComponent = section.icon;
                return (
                  <Card key={section.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl">{section.title}</CardTitle>
                            <CardDescription className="text-base">
                              {section.description}
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(section.difficulty)}>
                            {section.difficulty}
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            {section.estimatedTime} min
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {section.topics.map((topic) => (
                          <Badge key={topic} variant="secondary">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {section.content.map((content, index) => (
                        <div key={index}>
                          {renderContent(content)}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Interactive Tutorials */}
        <TabsContent value="tutorials" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutorials.map((tutorial) => (
              <Card key={tutorial.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                      <CardDescription>{tutorial.description}</CardDescription>
                    </div>
                    <Badge className={getDifficultyColor(tutorial.difficulty)}>
                      {tutorial.difficulty}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tutorial.estimatedTime} min
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {tutorial.steps.length} steps
                    </span>
                  </div>

                  {tutorial.prerequisites.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Prerequisites:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {tutorial.prerequisites.map((prereq, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            {prereq}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {tutorial.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {tutorialProgress.has(tutorial.id) && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{tutorialProgress.get(tutorial.id)}%</span>
                      </div>
                      <Progress value={tutorialProgress.get(tutorial.id)} />
                    </div>
                  )}

                  <Button
                    onClick={() => startTutorial(tutorial)}
                    className="w-full"
                    variant={tutorialProgress.get(tutorial.id) === 100 ? "outline" : "default"}
                  >
                    {tutorialProgress.get(tutorial.id) === 100 ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Restart Tutorial
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Tutorial
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* API Reference */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                API Reference
              </CardTitle>
              <CardDescription>
                Complete API documentation for developers and integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Our API documentation is hosted externally for better performance and searchability.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold">REST API</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Complete REST API documentation with examples
                    </p>
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View REST API Docs
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Zap className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold">WebSocket API</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Real-time data streaming and subscriptions
                    </p>
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View WebSocket Docs
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Settings className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold">SDK Documentation</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      JavaScript, Python, and other language SDKs
                    </p>
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View SDK Docs
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Code className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold">Code Examples</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Ready-to-use code examples and snippets
                    </p>
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Examples
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
