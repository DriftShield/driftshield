"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Bell, Shield, Wallet, User, Key, Mail, Moon, Zap, Check, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DashboardNav } from "@/components/dashboard-nav"
import Link from "next/link"

interface UserProfile {
  firstName: string
  lastName: string
  username: string
  bio: string
  email: string
  twitter: string
  website: string
}

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  driftAlerts: boolean
  marketUpdates: boolean
  insuranceAlerts: boolean
  walletActivity: boolean
}

interface WalletSettings {
  defaultNetwork: string
  slippageTolerance: string
  autoApprove: boolean
}

interface AppPreferences {
  language: string
  timezone: string
  currency: string
  darkMode: boolean
  compactView: boolean
  animations: boolean
  analytics: boolean
  publicProfile: boolean
}

export default function SettingsPage() {
  const { publicKey, disconnect, wallet } = useWallet()
  const { setVisible } = useWalletModal()
  const { toast } = useToast()
  const router = useRouter()

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    username: "",
    bio: "",
    email: "",
    twitter: "",
    website: "",
  })

  // Notification state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    driftAlerts: true,
    marketUpdates: false,
    insuranceAlerts: true,
    walletActivity: true,
  })

  // Wallet settings state
  const [walletSettings, setWalletSettings] = useState<WalletSettings>({
    defaultNetwork: "devnet",
    slippageTolerance: "0.5",
    autoApprove: false,
  })

  // App preferences state
  const [preferences, setPreferences] = useState<AppPreferences>({
    language: "en",
    timezone: "pst",
    currency: "usd",
    darkMode: true,
    compactView: false,
    animations: true,
    analytics: true,
    publicProfile: true,
  })

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("driftshield_profile")
    const savedNotifications = localStorage.getItem("driftshield_notifications")
    const savedWalletSettings = localStorage.getItem("driftshield_wallet_settings")
    const savedPreferences = localStorage.getItem("driftshield_preferences")

    if (savedProfile) setProfile(JSON.parse(savedProfile))
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications))
    if (savedWalletSettings) setWalletSettings(JSON.parse(savedWalletSettings))
    if (savedPreferences) setPreferences(JSON.parse(savedPreferences))
  }, [])

  // Handler functions
  const saveProfile = () => {
    localStorage.setItem("driftshield_profile", JSON.stringify(profile))
    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully.",
    })
  }

  const saveNotifications = () => {
    localStorage.setItem("driftshield_notifications", JSON.stringify(notifications))
    toast({
      title: "Notifications Updated",
      description: "Your notification preferences have been saved.",
    })
  }

  const saveWalletSettings = () => {
    localStorage.setItem("driftshield_wallet_settings", JSON.stringify(walletSettings))
    toast({
      title: "Wallet Settings Updated",
      description: "Your wallet settings have been saved.",
    })
  }

  const savePreferences = () => {
    localStorage.setItem("driftshield_preferences", JSON.stringify(preferences))
    toast({
      title: "Preferences Updated",
      description: "Your preferences have been saved.",
    })
  }

  const updatePassword = () => {
    if (!password.current || !password.new || !password.confirm) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      })
      return
    }
    if (password.new !== password.confirm) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }
    if (password.new.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      })
      return
    }
    toast({
      title: "Password Updated",
      description: "Your password has been changed successfully.",
    })
    setPassword({ current: "", new: "", confirm: "" })
  }

  const resetNotifications = () => {
    const defaults: NotificationSettings = {
      emailNotifications: true,
      pushNotifications: true,
      driftAlerts: true,
      marketUpdates: false,
      insuranceAlerts: true,
      walletActivity: true,
    }
    setNotifications(defaults)
    localStorage.setItem("driftshield_notifications", JSON.stringify(defaults))
    toast({
      title: "Reset Complete",
      description: "Notification settings have been reset to defaults.",
    })
  }

  const resetPreferences = () => {
    const defaults: AppPreferences = {
      language: "en",
      timezone: "pst",
      currency: "usd",
      darkMode: true,
      compactView: false,
      animations: true,
      analytics: true,
      publicProfile: true,
    }
    setPreferences(defaults)
    localStorage.setItem("driftshield_preferences", JSON.stringify(defaults))
    toast({
      title: "Reset Complete",
      description: "Preferences have been reset to defaults.",
    })
  }

  const handleConnectWallet = () => {
    setVisible(true)
  }

  const handleDisconnectWallet = () => {
    disconnect()
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    })
  }

  const exportData = () => {
    const data = {
      profile,
      notifications,
      walletSettings,
      preferences,
      wallet: publicKey?.toBase58() || null,
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `driftshield-data-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: "Data Exported",
      description: "Your data has been downloaded successfully.",
    })
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="lg:pl-64">
        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-balance">Settings</h1>
                <p className="text-muted-foreground mt-2">Manage your account preferences and configurations</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="gap-2">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and public profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-12 h-12 text-primary" />
                    </div>
                    <Button variant="outline" size="sm" className="mt-3 w-full bg-transparent">
                      Change Avatar
                    </Button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={profile.firstName}
                          onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={profile.lastName}
                          onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="johndoe"
                        value={profile.username}
                        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        placeholder="Tell us about yourself"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter Handle</Label>
                    <Input
                      id="twitter"
                      placeholder="@johndoe"
                      value={profile.twitter}
                      onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      placeholder="https://example.com"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setProfile({
                    firstName: "",
                    lastName: "",
                    username: "",
                    bio: "",
                    email: "",
                    twitter: "",
                    website: "",
                  })}>Cancel</Button>
                  <Button onClick={saveProfile}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified about activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="email-notif">Email Notifications</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      id="email-notif"
                      checked={notifications.emailNotifications}
                      onCheckedChange={(val) => setNotifications({ ...notifications, emailNotifications: val })}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="push-notif">Push Notifications</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                    </div>
                    <Switch
                      id="push-notif"
                      checked={notifications.pushNotifications}
                      onCheckedChange={(val) => setNotifications({ ...notifications, pushNotifications: val })}
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Alert Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="drift-alerts">Drift Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified when model drift is detected</p>
                      </div>
                      <Switch
                        id="drift-alerts"
                        checked={notifications.driftAlerts}
                        onCheckedChange={(val) => setNotifications({ ...notifications, driftAlerts: val })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="market-updates">Market Updates</Label>
                        <p className="text-sm text-muted-foreground">Updates on your active market positions</p>
                      </div>
                      <Switch
                        id="market-updates"
                        checked={notifications.marketUpdates}
                        onCheckedChange={(val) => setNotifications({ ...notifications, marketUpdates: val })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="insurance-alerts">Insurance Alerts</Label>
                        <p className="text-sm text-muted-foreground">Notifications about policy status and claims</p>
                      </div>
                      <Switch
                        id="insurance-alerts"
                        checked={notifications.insuranceAlerts}
                        onCheckedChange={(val) => setNotifications({ ...notifications, insuranceAlerts: val })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="wallet-activity">Wallet Activity</Label>
                        <p className="text-sm text-muted-foreground">
                          Alerts for deposits, withdrawals, and transactions
                        </p>
                      </div>
                      <Switch
                        id="wallet-activity"
                        checked={notifications.walletActivity}
                        onCheckedChange={(val) => setNotifications({ ...notifications, walletActivity: val })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={resetNotifications}>Reset to Default</Button>
                  <Button onClick={saveNotifications}>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="Enter current password"
                      className="mt-2"
                      value={password.current}
                      onChange={(e) => setPassword({ ...password, current: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      className="mt-2"
                      value={password.new}
                      onChange={(e) => setPassword({ ...password, new: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      className="mt-2"
                      value={password.confirm}
                      onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                    />
                  </div>
                  <Button onClick={updatePassword}>Update Password</Button>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="2fa">Two-Factor Authentication</Label>
                        {twoFactorEnabled && <Badge variant="secondary">Enabled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Switch id="2fa" checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                  </div>
                  {twoFactorEnabled && (
                    <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                      <p className="text-sm mb-3">Scan this QR code with your authenticator app:</p>
                      <div className="w-48 h-48 bg-background rounded-lg flex items-center justify-center border border-border">
                        <p className="text-xs text-muted-foreground">QR Code Placeholder</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Or enter this code manually: ABCD-EFGH-IJKL</p>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-muted-foreground">Chrome on macOS • San Francisco, CA</p>
                        <p className="text-xs text-muted-foreground mt-1">Last active: Just now</p>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div>
                        <p className="font-medium">Mobile Device</p>
                        <p className="text-sm text-muted-foreground">Safari on iOS • San Francisco, CA</p>
                        <p className="text-xs text-muted-foreground mt-1">Last active: 2 hours ago</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>Wallet Settings</CardTitle>
                <CardDescription>Manage your connected wallets and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Connected Wallets</h3>
                  {publicKey ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{wallet?.adapter.name || "Connected Wallet"}</p>
                            <p className="text-sm text-muted-foreground font-mono">{formatAddress(publicKey.toBase58())}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Connected</Badge>
                          <Button variant="outline" size="sm" onClick={handleDisconnectWallet}>
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No wallet connected</p>
                      <Button variant="outline" onClick={handleConnectWallet}>
                        Connect Wallet
                      </Button>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="default-network">Default Network</Label>
                    <Select
                      value={walletSettings.defaultNetwork}
                      onValueChange={(val) => setWalletSettings({ ...walletSettings, defaultNetwork: val })}
                    >
                      <SelectTrigger id="default-network" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mainnet">Solana Mainnet</SelectItem>
                        <SelectItem value="devnet">Solana Devnet</SelectItem>
                        <SelectItem value="testnet">Solana Testnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="slippage">Slippage Tolerance</Label>
                    <Select
                      value={walletSettings.slippageTolerance}
                      onValueChange={(val) => setWalletSettings({ ...walletSettings, slippageTolerance: val })}
                    >
                      <SelectTrigger id="slippage" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.1">0.1%</SelectItem>
                        <SelectItem value="0.5">0.5%</SelectItem>
                        <SelectItem value="1.0">1.0%</SelectItem>
                        <SelectItem value="2.0">2.0%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-approve">Auto-Approve Transactions</Label>
                      <p className="text-sm text-muted-foreground">Automatically approve small transactions</p>
                    </div>
                    <Switch
                      id="auto-approve"
                      checked={walletSettings.autoApprove}
                      onCheckedChange={(val) => setWalletSettings({ ...walletSettings, autoApprove: val })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={saveWalletSettings}>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle>App Preferences</CardTitle>
                <CardDescription>Customize your DriftShield experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(val) => setPreferences({ ...preferences, language: val })}
                    >
                      <SelectTrigger id="language" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(val) => setPreferences({ ...preferences, timezone: val })}
                    >
                      <SelectTrigger id="timezone" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                        <SelectItem value="est">Eastern Time (ET)</SelectItem>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="cet">Central European Time (CET)</SelectItem>
                        <SelectItem value="jst">Japan Standard Time (JST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency">Display Currency</Label>
                    <Select
                      value={preferences.currency}
                      onValueChange={(val) => setPreferences({ ...preferences, currency: val })}
                    >
                      <SelectTrigger id="currency" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                        <SelectItem value="gbp">GBP (£)</SelectItem>
                        <SelectItem value="jpy">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="dark-mode">Dark Mode</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">Use dark theme across the app</p>
                    </div>
                    <Switch
                      id="dark-mode"
                      checked={preferences.darkMode}
                      onCheckedChange={(val) => setPreferences({ ...preferences, darkMode: val })}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="compact-view">Compact View</Label>
                      <p className="text-sm text-muted-foreground">Show more information in less space</p>
                    </div>
                    <Switch
                      id="compact-view"
                      checked={preferences.compactView}
                      onCheckedChange={(val) => setPreferences({ ...preferences, compactView: val })}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="animations">Animations</Label>
                      <p className="text-sm text-muted-foreground">Enable smooth transitions and effects</p>
                    </div>
                    <Switch
                      id="animations"
                      checked={preferences.animations}
                      onCheckedChange={(val) => setPreferences({ ...preferences, animations: val })}
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Data & Privacy</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="analytics">Usage Analytics</Label>
                        <p className="text-sm text-muted-foreground">Help us improve by sharing anonymous usage data</p>
                      </div>
                      <Switch
                        id="analytics"
                        checked={preferences.analytics}
                        onCheckedChange={(val) => setPreferences({ ...preferences, analytics: val })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="public-profile">Public Profile</Label>
                        <p className="text-sm text-muted-foreground">Make your profile visible on leaderboards</p>
                      </div>
                      <Switch
                        id="public-profile"
                        checked={preferences.publicProfile}
                        onCheckedChange={(val) => setPreferences({ ...preferences, publicProfile: val })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={resetPreferences}>Reset to Default</Button>
                  <Button onClick={savePreferences}>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-destructive/10 border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions that affect your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent" onClick={exportData}>
                  Export All Data
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive bg-transparent"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                      toast({
                        title: "Account Deletion Requested",
                        description: "Please contact support to complete account deletion.",
                      })
                    }
                  }}
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  )
}
