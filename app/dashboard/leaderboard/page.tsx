'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Crown,
  Star,
  ExternalLink,
  UserPlus,
  UserCheck,
  ArrowLeft,
} from 'lucide-react';
import { getLeaderboard, isFollowing, followTrader, unfollowTrader } from '@/lib/social/service';
import { LeaderboardEntry } from '@/lib/social/types';
import Link from 'next/link';
import { DashboardNav } from '@/components/dashboard-nav';

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [metric, setMetric] = useState<'pnl' | 'roi' | 'win_rate' | 'volume'>('pnl');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');
  const [followingMap, setFollowingMap] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [metric, period]);

  const loadLeaderboard = () => {
    setLoading(true);
    const data = getLeaderboard(period, metric, 100);
    setLeaderboard(data);
    setLoading(false);
  };

  const handleFollowToggle = (traderId: string) => {
    if (!publicKey) return;

    const userId = publicKey.toString();
    const isCurrentlyFollowing = followingMap.has(traderId);

    if (isCurrentlyFollowing) {
      unfollowTrader(userId, traderId);
      setFollowingMap(prev => {
        const next = new Set(prev);
        next.delete(traderId);
        return next;
      });
    } else {
      followTrader(userId, traderId);
      setFollowingMap(prev => new Set(prev).add(traderId));
    }
  };

  const getMetricValue = (entry: LeaderboardEntry) => {
    switch (metric) {
      case 'pnl':
        return entry.stats.totalPnL >= 0
          ? `+$${entry.stats.totalPnL.toFixed(2)}`
          : `-$${Math.abs(entry.stats.totalPnL).toFixed(2)}`;
      case 'roi':
        return `${entry.stats.roi >= 0 ? '+' : ''}${entry.stats.roi.toFixed(1)}%`;
      case 'win_rate':
        return `${entry.stats.winRate.toFixed(1)}%`;
      case 'volume':
        return `$${entry.stats.volumeTraded.toLocaleString()}`;
      default:
        return '-';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Award className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-orange-600" />;
    return <span className="text-muted-foreground font-mono w-8 text-center">#{rank}</span>;
  };

  const getBadgeColor = (badge: string) => {
    const colors: Record<string, string> = {
      top_10: 'bg-yellow-500/20 text-yellow-500',
      top_50: 'bg-blue-500/20 text-blue-500',
      verified: 'bg-green-500/20 text-green-500',
      whale: 'bg-purple-500/20 text-purple-500',
      consistent: 'bg-orange-500/20 text-orange-500',
      high_roi: 'bg-pink-500/20 text-pink-500',
    };
    return colors[badge] || 'bg-gray-500/20';
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Trophy className="h-8 w-8" />
                  Leaderboard
                </h1>
                <p className="text-muted-foreground">Top performing traders on DriftShield</p>
              </div>
            </div>
          </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Trader</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {leaderboard[0] ? (
              <>
                <div className="text-2xl font-bold truncate">{leaderboard[0].displayName}</div>
                <p className="text-xs text-muted-foreground">
                  {getMetricValue(leaderboard[0])}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Traders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaderboard.length}</div>
            <p className="text-xs text-muted-foreground">Public profiles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaderboard.length > 0
                ? (leaderboard.reduce((sum, e) => sum + e.stats.winRate, 0) / leaderboard.length).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all traders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${leaderboard.reduce((sum, e) => sum + e.stats.volumeTraded, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Combined volume</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Rankings</CardTitle>
              <CardDescription>Sorted by {metric.replace('_', ' ')}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as any)}
                className="px-3 py-2 rounded-md border bg-background text-sm"
              >
                <option value="pnl">Total P&L</option>
                <option value="roi">ROI %</option>
                <option value="win_rate">Win Rate</option>
                <option value="volume">Volume</option>
              </select>

              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="px-3 py-2 rounded-md border bg-background text-sm"
              >
                <option value="all_time">All Time</option>
                <option value="monthly">This Month</option>
                <option value="weekly">This Week</option>
                <option value="daily">Today</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.traderId}
                className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border gap-4 ${
                  entry.rank <= 3 ? 'bg-muted/50' : ''
                } hover:bg-muted/30 transition-colors`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Rank */}
                  <div className="w-12 flex items-center justify-center flex-shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-primary">
                      {entry.displayName[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Trader Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">
                        {entry.displayName}
                      </span>
                      {entry.verified && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span>{entry.stats.totalTrades} trades</span>
                      <span>•</span>
                      <span>{entry.followers} followers</span>
                      {entry.badges.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            {entry.badges.slice(0, 3).map((badge, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className={`text-xs px-1 ${getBadgeColor(badge)}`}
                              >
                                {badge.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Stats */}
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      metric === 'pnl' || metric === 'roi'
                        ? entry.stats[metric === 'pnl' ? 'totalPnL' : 'roi'] >= 0
                          ? 'text-green-500'
                          : 'text-red-500'
                        : ''
                    }`}>
                      {getMetricValue(entry)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.stats.winRate.toFixed(1)}% win rate
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {publicKey && entry.traderId !== publicKey.toString() && (
                    <Button
                      variant={followingMap.has(entry.traderId) ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleFollowToggle(entry.traderId)}
                    >
                      {followingMap.has(entry.traderId) ? (
                        <>
                          <UserCheck className="h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">Follow</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {leaderboard.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No traders found</p>
                <p className="text-sm">Be the first to trade and claim the top spot!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
