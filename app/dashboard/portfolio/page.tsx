'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, Activity, PieChart, AlertTriangle, ArrowLeft } from 'lucide-react';
import {
  getOpenPositions,
  getClosedPositions,
  getTrades,
  exportPortfolioData,
} from '@/lib/portfolio/service';
import {
  calculatePortfolioSummary,
  calculateRiskMetrics,
  exportToCSV,
} from '@/lib/portfolio/calculator';
import { Position, ClosedPosition, Trade } from '@/lib/portfolio/types';
import { DashboardNav } from '@/components/dashboard-nav';
import Link from 'next/link';

export default function PortfolioPage() {
  const { publicKey } = useWallet();
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    loadPortfolioData();
  }, [publicKey]);

  const loadPortfolioData = () => {
    if (!publicKey) return;

    const wallet = publicKey.toString();
    setOpenPositions(getOpenPositions(wallet));
    setClosedPositions(getClosedPositions(wallet));
    setTrades(getTrades(wallet));
    setLoading(false);
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(openPositions, closedPositions, trades);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driftshield-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="lg:pl-64">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Connect Wallet</CardTitle>
                <CardDescription>
                  Connect your wallet to view your portfolio
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const summary = calculatePortfolioSummary(openPositions, closedPositions);
  const riskMetrics = calculateRiskMetrics(openPositions, summary.currentValue + 1000); // Assuming $1000 total balance for demo

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
                <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
                <p className="text-muted-foreground">Track your performance and manage risk</p>
              </div>
            </div>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.currentValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              ${summary.totalInvested.toFixed(2)} invested
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {summary.totalPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {summary.totalPnL >= 0 ? '+' : ''}${summary.totalPnL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalPnLPercent >= 0 ? '+' : ''}{summary.totalPnLPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.closedPositions} trades closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${
              riskMetrics.riskScore > 70 ? 'text-red-500' :
              riskMetrics.riskScore > 40 ? 'text-yellow-500' :
              'text-green-500'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {riskMetrics.riskScore.toFixed(0)}/100
            </div>
            <p className="text-xs text-muted-foreground">
              {riskMetrics.riskScore > 70 ? 'High' : riskMetrics.riskScore > 40 ? 'Medium' : 'Low'} risk
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Open Positions ({openPositions.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedPositions.length})</TabsTrigger>
          <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
          <TabsTrigger value="trades">Trade History ({trades.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>Your active market positions</CardDescription>
            </CardHeader>
            <CardContent>
              {openPositions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No open positions. Start betting to build your portfolio!
                </p>
              ) : (
                <div className="space-y-4">
                  {openPositions.map((position) => (
                    <div key={position.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{position.marketTitle}</h3>
                          <p className="text-sm text-muted-foreground">
                            {position.outcome} • {position.sharesOwned.toFixed(2)} shares @ ${position.avgEntryPrice.toFixed(4)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Invested: ${position.totalInvested.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">
                          Current: ${position.currentValue.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">
                          Current Price: ${position.currentPrice.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Closed Positions</CardTitle>
              <CardDescription>Your trading history and realized P&L</CardDescription>
            </CardHeader>
            <CardContent>
              {closedPositions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No closed positions yet
                </p>
              ) : (
                <div className="space-y-4">
                  {closedPositions.map((position) => (
                    <div key={position.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{position.marketTitle}</h3>
                          <p className="text-sm text-muted-foreground">
                            {position.outcome} • {position.sharesOwned.toFixed(2)} shares
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Held for {position.holdingPeriod} days
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${position.realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {position.realizedPnL >= 0 ? '+' : ''}${position.realizedPnL.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {position.realizedPnLPercent >= 0 ? '+' : ''}{position.realizedPnLPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                        <span>Entry: ${position.avgEntryPrice.toFixed(4)}</span>
                        <span>Exit: ${position.closePrice.toFixed(4)}</span>
                        <span>{new Date(position.closeDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Concentration</CardTitle>
                <CardDescription>How diversified is your portfolio?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Top Position</span>
                    <span className="text-sm font-medium">
                      {riskMetrics.portfolioConcentration.topPosition.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${riskMetrics.portfolioConcentration.topPosition}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Top 3 Positions</span>
                    <span className="text-sm font-medium">
                      {riskMetrics.portfolioConcentration.top3Positions.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${riskMetrics.portfolioConcentration.top3Positions}%` }}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Herfindahl Index: {riskMetrics.portfolioConcentration.herfindahlIndex.toFixed(3)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lower is more diversified (0 = perfectly diversified, 1 = concentrated)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exposure</CardTitle>
                <CardDescription>Capital deployment and risk</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Exposure</span>
                    <span className="text-sm font-medium">
                      ${riskMetrics.exposure.totalExposure.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Available</span>
                    <span className="text-sm font-medium">
                      ${riskMetrics.exposure.availableBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Deployed</span>
                    <span className="text-sm font-medium">
                      {riskMetrics.exposure.exposurePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      riskMetrics.exposure.exposurePercent > 80 ? 'bg-red-500' :
                      riskMetrics.exposure.exposurePercent > 50 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(riskMetrics.exposure.exposurePercent, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Diversification</CardTitle>
                <CardDescription>Market and outcome distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Markets</h4>
                    <p className="text-2xl font-bold">
                      {riskMetrics.diversification.numberOfMarkets}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Different markets
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Outcome Balance</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>YES exposure</span>
                        <span className="font-medium">
                          ${riskMetrics.diversification.outcomeBalance.yesExposure.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>NO exposure</span>
                        <span className="font-medium">
                          ${riskMetrics.diversification.outcomeBalance.noExposure.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>All your buy and sell transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No trades yet
                </p>
              ) : (
                <div className="space-y-2">
                  {trades.slice().reverse().map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between border-b pb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.type === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                          }`}>
                            {trade.type}
                          </span>
                          <span className="font-medium">{trade.marketTitle}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {trade.outcome} • {trade.shares.toFixed(2)} @ ${trade.price.toFixed(4)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${trade.totalCost.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
}
