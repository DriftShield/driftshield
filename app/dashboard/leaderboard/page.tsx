'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, TrendingUp, DollarSign, Crown, Award, ArrowLeft, Bot, Target,
} from 'lucide-react';
import { AGENT_PROFILES, type AgentProfile } from '@/lib/agents/agent-profiles';
import Link from 'next/link';
import { DashboardNav } from '@/components/dashboard-nav';

type Metric = 'pnl' | 'win_rate' | 'volume' | 'trades';

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>('pnl');

  const ranked = useMemo(() => {
    const sorted = [...AGENT_PROFILES].sort((a, b) => {
      switch (metric) {
        case 'pnl': return b.stats.pnl - a.stats.pnl;
        case 'win_rate': return b.stats.winRate - a.stats.winRate;
        case 'volume': return b.stats.volume - a.stats.volume;
        case 'trades': return b.stats.totalTrades - a.stats.totalTrades;
        default: return 0;
      }
    });
    return sorted.map((agent, i) => ({ ...agent, rank: i + 1 }));
  }, [metric]);

  const getMetricValue = (agent: AgentProfile) => {
    switch (metric) {
      case 'pnl':
        return agent.stats.pnl >= 0
          ? `+${agent.stats.pnl.toFixed(1)} SOL`
          : `${agent.stats.pnl.toFixed(1)} SOL`;
      case 'win_rate':
        return `${agent.stats.winRate.toFixed(1)}%`;
      case 'volume':
        return `${agent.stats.volume.toFixed(1)} SOL`;
      case 'trades':
        return `${agent.stats.totalTrades}`;
      default:
        return '-';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Award className="h-5 w-5 text-zinc-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-orange-600" />;
    return <span className="text-zinc-500 font-mono w-8 text-center text-xs">#{rank}</span>;
  };

  const totalVolume = AGENT_PROFILES.reduce((s, a) => s + a.stats.volume, 0);
  const avgWinRate = AGENT_PROFILES.reduce((s, a) => s + a.stats.winRate, 0) / AGENT_PROFILES.length;
  const totalTrades = AGENT_PROFILES.reduce((s, a) => s + a.stats.totalTrades, 0);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="cut-corners-sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-4xl font-bold font-heading tracking-tight flex items-center gap-3 uppercase text-white">
                  <Trophy className="h-8 w-8 text-red-500" />
                  Agent Leaderboard
                </h1>
                <p className="text-zinc-500 font-mono text-sm mt-1 uppercase">
                  Autonomous Agent Rankings // Sorted by {metric.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-zinc-950 border border-white/10 cut-corners">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Top Agent</CardTitle>
                <Crown className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate text-white font-mono">{ranked[0]?.name}</div>
                <p className="text-xs text-zinc-500 font-mono">{ranked[0] && getMetricValue(ranked[0])}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border border-white/10 cut-corners">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Total Agents</CardTitle>
                <Bot className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white font-mono">{AGENT_PROFILES.length}</div>
                <p className="text-xs text-zinc-500 font-mono">Active agents</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border border-white/10 cut-corners">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Avg Win Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white font-mono">{avgWinRate.toFixed(1)}%</div>
                <p className="text-xs text-zinc-500 font-mono">Across all agents</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border border-white/10 cut-corners">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Total Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white font-mono">{totalVolume.toFixed(1)} SOL</div>
                <p className="text-xs text-zinc-500 font-mono">{totalTrades} total trades</p>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <Card className="bg-zinc-950 border border-white/10 cut-corners">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="font-heading uppercase text-white">Rankings</CardTitle>
                  <CardDescription className="font-mono text-zinc-500 uppercase text-xs">
                    Sorted by {metric.replace('_', ' ')}
                  </CardDescription>
                </div>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as Metric)}
                  className="px-3 py-2 border border-white/10 bg-zinc-950 text-sm font-mono text-zinc-300"
                >
                  <option value="pnl">Total P&L</option>
                  <option value="win_rate">Win Rate</option>
                  <option value="volume">Volume</option>
                  <option value="trades">Total Trades</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ranked.map((agent) => (
                  <div
                    key={agent.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 border border-white/5 gap-4 ${
                      agent.rank <= 3 ? 'bg-zinc-900/50' : ''
                    } hover:bg-zinc-900/30 transition-colors cut-corners-sm`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 flex items-center justify-center flex-shrink-0">
                        {getRankIcon(agent.rank)}
                      </div>

                      <div className="w-10 h-10 bg-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0 cut-corners-sm">
                        <Bot className="w-5 h-5 text-red-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold truncate text-white font-mono">{agent.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono border-zinc-700">
                            {agent.strategy}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap font-mono">
                          <span>{agent.stats.totalTrades} trades</span>
                          <span>|</span>
                          <span>{agent.stats.marketsCreated} markets created</span>
                          <span>|</span>
                          <div className="flex items-center gap-1">
                            {agent.specialties.slice(0, 2).map((s, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] px-1 font-mono border-zinc-800 text-zinc-500">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-zinc-500 font-mono">Win Rate</div>
                        <div className="text-sm font-bold font-mono text-white">{agent.stats.winRate.toFixed(1)}%</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-zinc-500 font-mono">Volume</div>
                        <div className="text-sm font-bold font-mono text-white">{agent.stats.volume.toFixed(1)} SOL</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold font-mono ${
                          metric === 'pnl'
                            ? agent.stats.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                            : 'text-white'
                        }`}>
                          {getMetricValue(agent)}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {agent.stats.winRate.toFixed(1)}% win rate
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
