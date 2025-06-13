'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Users,
  Trophy,
  Star,
  Shield,
  Zap,
  Target,
  Crown,
  Heart,
  Copy,
  TrendingUp,
  DollarSign,
  Rocket,
  Award,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Gift,
  Flame,
  Bot,
  Brain,
  Eye,
  MessageCircle,
  Share2,
  Settings,
  Wallet,
  Lock,
  Unlock,
  Bell
} from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  component: React.ComponentType<any>
  required: boolean
  completed: boolean
}

interface UserProfile {
  username: string
  displayName: string
  bio: string
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  tradingExperience: 'beginner' | 'intermediate' | 'advanced'
  interests: string[]
  socialSettings: {
    sharePortfolio: boolean
    allowCopying: boolean
    showInLeaderboard: boolean
    enableNotifications: boolean
  }
  copyTradingSettings: {
    maxAllocation: number
    autoStopLoss: boolean
    stopLossPercentage: number
    followOnlyVerified: boolean
  }
}

export function CommunityOnboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    displayName: '',
    bio: '',
    riskTolerance: 'moderate',
    tradingExperience: 'beginner',
    interests: [],
    socialSettings: {
      sharePortfolio: true,
      allowCopying: false,
      showInLeaderboard: true,
      enableNotifications: true
    },
    copyTradingSettings: {
      maxAllocation: 10,
      autoStopLoss: true,
      stopLossPercentage: 15,
      followOnlyVerified: true
    }
  })

  const [isComplete, setIsComplete] = useState(false)

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to the Roach Army!',
      description: 'Join the most powerful meme coin trading community',
      icon: <Crown className="w-6 h-6" />,
      component: WelcomeStep,
      required: true,
      completed: false
    },
    {
      id: 'profile',
      title: 'Create Your Profile',
      description: 'Set up your trader identity',
      icon: <Users className="w-6 h-6" />,
      component: ProfileStep,
      required: true,
      completed: false
    },
    {
      id: 'trading-style',
      title: 'Define Your Trading Style',
      description: 'Help us personalize your experience',
      icon: <Target className="w-6 h-6" />,
      component: TradingStyleStep,
      required: true,
      completed: false
    },
    {
      id: 'social-settings',
      title: 'Social Trading Setup',
      description: 'Configure your social features',
      icon: <Share2 className="w-6 h-6" />,
      component: SocialSettingsStep,
      required: false,
      completed: false
    },
    {
      id: 'copy-trading',
      title: 'Copy Trading Configuration',
      description: 'Set up automatic copy trading',
      icon: <Copy className="w-6 h-6" />,
      component: CopyTradingStep,
      required: false,
      completed: false
    },
    {
      id: 'tutorial',
      title: 'Platform Tutorial',
      description: 'Learn the platform features',
      icon: <Brain className="w-6 h-6" />,
      component: TutorialStep,
      required: false,
      completed: false
    },
    {
      id: 'complete',
      title: 'Welcome to the Community!',
      description: 'Your onboarding is complete',
      icon: <Rocket className="w-6 h-6" />,
      component: CompletionStep,
      required: true,
      completed: false
    }
  ]

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]))
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    if (!steps[currentStep].required) {
      handleNext()
    }
  }

  const handleComplete = async () => {
    // Save profile to backend
    try {
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile)
      })

      if (response.ok) {
        setIsComplete(true)
        // Trigger confetti or celebration animation
      }
    } catch (error) {
      console.error('Failed to save onboarding:', error)
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  if (isComplete) {
    return <OnboardingComplete profile={profile} />
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl glassmorphism border-nuclear-glow/30">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-2xl text-nuclear-glow">
              Community Onboarding
            </CardTitle>
            <Badge className="bg-nuclear-glow/20 text-nuclear-glow">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {React.createElement(steps[currentStep].component, {
                profile,
                setProfile,
                step: steps[currentStep]
              })}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <div className="flex space-x-3">
              {!steps[currentStep].required && currentStep < steps.length - 1 && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  Skip
                </Button>
              )}

              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleComplete}
                  className="bg-nuclear-gradient text-background flex items-center space-x-2"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Complete Onboarding</span>
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="bg-nuclear-gradient text-background flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Welcome Step Component
function WelcomeStep({ step }: { step: OnboardingStep }) {
  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="flex justify-center"
      >
        <div className="w-24 h-24 rounded-full bg-nuclear-gradient flex items-center justify-center">
          <Crown className="w-12 h-12 text-background" />
        </div>
      </motion.div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-nuclear-glow">
          Welcome to the BoomRoach Army! 🪳💎
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          You're about to join the most advanced meme coin trading community.
          Our AI-powered platform will help you maximize your returns while
          connecting with elite traders worldwide.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <FeatureCard
          icon={<Bot className="w-8 h-8 text-neon-blue" />}
          title="AI Trading"
          description="Advanced algorithms for maximum returns"
        />
        <FeatureCard
          icon={<Users className="w-8 h-8 text-neon-green" />}
          title="Social Trading"
          description="Copy successful traders automatically"
        />
        <FeatureCard
          icon={<Shield className="w-8 h-8 text-nuclear-glow" />}
          title="Risk Management"
          description="Advanced protection systems"
        />
      </div>
    </div>
  )
}

// Profile Step Component
function ProfileStep({
  profile,
  setProfile
}: {
  profile: UserProfile
  setProfile: (profile: UserProfile) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-nuclear-glow mb-2">
          Create Your Trader Profile
        </h2>
        <p className="text-muted-foreground">
          This information helps us personalize your experience
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="roach_trader_2025"
              value={profile.username}
              onChange={(e) => setProfile({
                ...profile,
                username: e.target.value
              })}
            />
          </div>

          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="The Roach King"
              value={profile.displayName}
              onChange={(e) => setProfile({
                ...profile,
                displayName: e.target.value
              })}
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio (Optional)</Label>
            <textarea
              id="bio"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              placeholder="Tell the community about yourself..."
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile({
                ...profile,
                bio: e.target.value
              })}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-base font-semibold">Trading Experience</Label>
            <div className="grid grid-cols-1 gap-3 mt-3">
              {[
                { value: 'beginner', label: 'Beginner', desc: 'New to trading' },
                { value: 'intermediate', label: 'Intermediate', desc: 'Some experience' },
                { value: 'advanced', label: 'Advanced', desc: 'Experienced trader' }
              ].map((option) => (
                <div
                  key={option.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    profile.tradingExperience === option.value
                      ? 'border-nuclear-glow bg-nuclear-glow/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  onClick={() => setProfile({
                    ...profile,
                    tradingExperience: option.value as any
                  })}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold">Risk Tolerance</Label>
            <div className="grid grid-cols-1 gap-3 mt-3">
              {[
                { value: 'conservative', label: 'Conservative', desc: 'Steady growth' },
                { value: 'moderate', label: 'Moderate', desc: 'Balanced approach' },
                { value: 'aggressive', label: 'Aggressive', desc: 'High risk, high reward' }
              ].map((option) => (
                <div
                  key={option.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    profile.riskTolerance === option.value
                      ? 'border-nuclear-glow bg-nuclear-glow/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  onClick={() => setProfile({
                    ...profile,
                    riskTolerance: option.value as any
                  })}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Additional step components would be implemented here...
// TradingStyleStep, SocialSettingsStep, CopyTradingStep, TutorialStep, CompletionStep

function TradingStyleStep({ profile, setProfile }: any) {
  const interests = [
    'meme-coins', 'defi', 'nfts', 'gaming', 'metaverse',
    'ai-tokens', 'layer-1', 'layer-2', 'staking', 'yield-farming'
  ]

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-nuclear-glow mb-2">
          Define Your Trading Style
        </h2>
        <p className="text-muted-foreground">
          Help us recommend the best traders and strategies for you
        </p>
      </div>

      <div>
        <Label className="text-base font-semibold mb-4 block">
          What interests you? (Select all that apply)
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {interests.map((interest) => (
            <div
              key={interest}
              className={`p-3 rounded-lg border cursor-pointer transition-colors text-center ${
                profile.interests.includes(interest)
                  ? 'border-nuclear-glow bg-nuclear-glow/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
              onClick={() => {
                const newInterests = profile.interests.includes(interest)
                  ? profile.interests.filter((i: string) => i !== interest)
                  : [...profile.interests, interest]
                setProfile({ ...profile, interests: newInterests })
              }}
            >
              <div className="font-medium capitalize">
                {interest.replace('-', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper Components
function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className="glassmorphism border-neon-blue/30 text-center">
      <CardContent className="p-6">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function OnboardingComplete({ profile }: { profile: UserProfile }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="text-center space-y-8"
      >
        <div className="w-32 h-32 rounded-full bg-nuclear-gradient flex items-center justify-center mx-auto">
          <Crown className="w-16 h-16 text-background" />
        </div>

        <div>
          <h1 className="text-4xl font-bold text-nuclear-glow mb-4">
            Welcome to the Army, {profile.displayName}! 🪳💎
          </h1>
          <p className="text-xl text-muted-foreground">
            Your journey to meme coin domination begins now!
          </p>
        </div>

        <Button
          size="lg"
          className="bg-nuclear-gradient text-background"
          onClick={() => window.location.href = '/dashboard'}
        >
          <Rocket className="w-5 h-5 mr-2" />
          Enter the Trading Arena
        </Button>
      </motion.div>
    </div>
  )
}

export default CommunityOnboarding
