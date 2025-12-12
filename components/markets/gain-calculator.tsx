'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { calculatePotentialGains, calculateExpectedValue, MoonStrategies } from '@/lib/amm/polymarket-gains';
import { TrendingUp, Target, Zap, AlertCircle } from 'lucide-react';

interface GainCalculatorProps {
  currentPrice: number;  // YES price (0-1)
  outcome: 'YES' | 'NO';
}

export function GainCalculator({ currentPrice, outcome }: GainCalculatorProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [estimatedWinProb, setEstimatedWinProb] = useState(currentPrice);

  const buyPrice = currentPrice;
  const tokenAmount = betAmount / buyPrice;

  const gains = calculatePotentialGains(buyPrice, tokenAmount, currentPrice);
  const ev = calculateExpectedValue(buyPrice, estimatedWinProb);

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Bet Amount (SOL)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 p-2 rounded border bg-background"
              min="0.01"
              step="0.1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Your Win Probability Estimate
            </label>
            <input
              type="range"
              value={estimatedWinProb * 100}
              onChange={(e) => setEstimatedWinProb(parseFloat(e.target.value) / 100)}
              className="w-full mt-1"
              min="0"
              max="100"
              step="1"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {(estimatedWinProb * 100).toFixed(0)}% (Market: {(currentPrice * 100).toFixed(0)}%)
            </div>
          </div>
        </div>
      </Card>

      {/* Expected Value */}
      <Card className={`p-4 border-2 ${ev.isPositiveEV ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Expected Value</span>
          </div>
          <span className={`text-lg font-bold ${ev.isPositiveEV ? 'text-green-500' : 'text-red-500'}`}>
            {ev.evPercent > 0 ? '+' : ''}{ev.evPercent.toFixed(1)}%
          </span>
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          {ev.recommendation}
        </div>
        <div className="text-xs text-muted-foreground">
          {ev.isPositiveEV
            ? `This bet is undervalued. If your ${(estimatedWinProb * 100).toFixed(0)}% estimate is correct, you have a +EV edge.`
            : `This bet is overpriced based on your ${(estimatedWinProb * 100).toFixed(0)}% estimate.`
          }
        </div>
      </Card>

      {/* Gain Scenarios */}
      <div className="space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Potential Gains
        </div>

        {gains.scenarios.map((scenario, i) => {
          const colors = {
            conservative: 'border-blue-500/30 bg-blue-500/5',
            realistic: 'border-yellow-500/30 bg-yellow-500/5',
            moon: 'border-green-500/30 bg-green-500/5',
          };

          const icons = {
            conservative: '📊',
            realistic: '📈',
            moon: '🚀',
          };

          return (
            <Card key={i} className={`p-3 border ${colors[scenario.likelihood]}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {icons[scenario.likelihood]} {scenario.multiplier.toFixed(1)}x Gain
                  </div>
                  <div className="text-xs text-muted-foreground">
                    If {outcome} price reaches ${scenario.targetPrice.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-500">
                    +${scenario.profit.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    +{scenario.profitPercent.toFixed(0)}%
                  </div>
                </div>
              </div>

              {scenario.requiredPriceMove > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Needs: {scenario.requiredPriceMove.toFixed(0)}% price increase
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Max Gain Highlight */}
      {gains.maxGain && (
        <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="font-bold">Maximum Possible Gain</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-500">
                {gains.maxGain.multiplier.toFixed(1)}x
              </div>
              <div className="text-sm text-muted-foreground">
                If {outcome} wins (${gains.maxGain.targetPrice.toFixed(2)})
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-500">
                +${gains.maxGain.profit.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                on ${betAmount.toFixed(2)} bet
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Trading Strategies */}
      <Card className="p-4">
        <div className="text-sm font-medium mb-3">💡 Proven Strategies</div>
        <div className="space-y-2">
          {Object.entries(MoonStrategies).map(([key, strategy]) => (
            <div key={key} className="p-2 bg-secondary/30 rounded text-xs">
              <div className="font-medium">{key.replace('_', ' ')}</div>
              <div className="text-muted-foreground">{strategy.description}</div>
              <div className="text-green-500 mt-1">
                Target: {strategy.potentialGain} gain
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Historical Examples */}
      <Card className="p-4 bg-secondary/20">
        <div className="text-sm font-medium mb-2">🌙 Prediction Market Moon Shots</div>
        <div className="space-y-2 text-xs">
          <div className="p-2 bg-background rounded">
            <div className="font-medium">FTX Bankruptcy 2022</div>
            <div className="text-muted-foreground">Bought at $0.02 → $1.00</div>
            <div className="text-green-500 font-bold">50x gain in 1 week</div>
          </div>
          <div className="p-2 bg-background rounded">
            <div className="font-medium">Ukraine Invasion 2022</div>
            <div className="text-muted-foreground">Bought at $0.10 → $0.95</div>
            <div className="text-green-500 font-bold">9.5x gain in 2 weeks</div>
          </div>
          <div className="p-2 bg-background rounded">
            <div className="font-medium">Trump Indictment 2023</div>
            <div className="text-muted-foreground">Bought at $0.15 → $1.00</div>
            <div className="text-green-500 font-bold">6.6x gain in 3 months</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
