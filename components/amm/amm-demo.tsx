'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConstantProductAMM } from '@/lib/amm/constant-product';
import { LMSRAMM } from '@/lib/amm/lmsr';
import type { AMMPool } from '@/lib/amm/constant-product';
import type { LMSRPool } from '@/lib/amm/lmsr';

export function AMMDemo() {
  // Constant Product Pool
  const [cpPool, setCpPool] = useState<AMMPool>(() =>
    ConstantProductAMM.initializePool(1000)
  );

  // LMSR Pool
  const [lmsrPool, setLmsrPool] = useState<LMSRPool>(() =>
    LMSRAMM.initializePool(['YES', 'NO'], 500)
  );

  const [betAmount, setBetAmount] = useState<string>('10');
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');

  const handleCPBet = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;

    const result = ConstantProductAMM.calculateSharesOut(cpPool, amount, outcome);
    setCpPool(result.newPool);
  };

  const handleLMSRBet = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) return;

    const outcomeIndex = outcome === 'YES' ? 0 : 1;
    const result = LMSRAMM.calculateSharesForBet(lmsrPool, outcomeIndex, amount);
    setLmsrPool(result.newPool);
  };

  const cpStats = ConstantProductAMM.getPoolStats(cpPool);
  const lmsrStats = LMSRAMM.getPoolStats(lmsrPool);

  const cpImpact = ConstantProductAMM.calculatePriceImpact(
    cpPool,
    parseFloat(betAmount) || 0,
    outcome
  );

  const lmsrImpact = LMSRAMM.calculatePriceImpact(
    lmsrPool,
    outcome === 'YES' ? 0 : 1,
    parseFloat(betAmount) || 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">AMM Comparison Demo</h2>
        <p className="text-muted-foreground">
          Compare Constant Product vs LMSR automated market makers
        </p>
      </div>

      {/* Bet Controls */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Place Bet</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Amount (SOL)</label>
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="10"
              min="0.01"
              step="0.01"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Outcome</label>
            <div className="flex gap-2">
              <Button
                variant={outcome === 'YES' ? 'default' : 'outline'}
                onClick={() => setOutcome('YES')}
                className="flex-1"
              >
                YES
              </Button>
              <Button
                variant={outcome === 'NO' ? 'default' : 'outline'}
                onClick={() => setOutcome('NO')}
                className="flex-1"
              >
                NO
              </Button>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleCPBet} className="flex-1">
              Bet (CP)
            </Button>
            <Button onClick={handleLMSRBet} className="flex-1" variant="secondary">
              Bet (LMSR)
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Constant Product AMM */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Constant Product (xy=k)</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-sm text-muted-foreground">YES Price</div>
                <div className="text-2xl font-bold text-green-500">
                  {cpStats.yesImpliedOdds}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ${(cpStats.yesPrice * 100).toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-sm text-muted-foreground">NO Price</div>
                <div className="text-2xl font-bold text-red-500">
                  {cpStats.noImpliedOdds}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ${(cpStats.noPrice * 100).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Volume:</span>
                <span className="font-medium">{cpStats.totalVolume.toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">YES Volume:</span>
                <span className="font-medium">{cpStats.yesVolume.toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">NO Volume:</span>
                <span className="font-medium">{cpStats.noVolume.toFixed(2)} SOL</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">Next Bet Impact:</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price Impact:</span>
                  <span className={cpImpact.priceImpact > 0.1 ? 'text-red-500' : 'text-green-500'}>
                    {(cpImpact.priceImpact * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Price:</span>
                  <span>{(cpImpact.priceAfter * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* LMSR AMM */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">LMSR (Logarithmic)</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-sm text-muted-foreground">YES Price</div>
                <div className="text-2xl font-bold text-green-500">
                  {lmsrStats.outcomes[0].impliedOdds}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ${(lmsrStats.outcomes[0].price * 100).toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-sm text-muted-foreground">NO Price</div>
                <div className="text-2xl font-bold text-red-500">
                  {lmsrStats.outcomes[1].impliedOdds}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ${(lmsrStats.outcomes[1].price * 100).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Volume:</span>
                <span className="font-medium">{lmsrStats.totalVolume.toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">YES Volume:</span>
                <span className="font-medium">{lmsrStats.outcomes[0].volume.toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">NO Volume:</span>
                <span className="font-medium">{lmsrStats.outcomes[1].volume.toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liquidity Param:</span>
                <span className="font-medium">{lmsrStats.liquidityParameter}</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">Next Bet Impact:</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price Impact:</span>
                  <span className={lmsrImpact.priceImpact > 0.1 ? 'text-red-500' : 'text-green-500'}>
                    {(lmsrImpact.priceImpact * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Price:</span>
                  <span>{(lmsrImpact.priceAfter * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shares:</span>
                  <span>{lmsrImpact.shares.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Explanation */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Key Differences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-500 mb-2">Constant Product (xy=k)</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ Simple and intuitive</li>
              <li>✅ Used by Uniswap, SushiSwap</li>
              <li>✅ Fast price discovery</li>
              <li>⚠️ Higher slippage on large bets</li>
              <li>⚠️ Less stable for prediction markets</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-500 mb-2">LMSR (Logarithmic)</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ Better for prediction markets</li>
              <li>✅ More stable prices</li>
              <li>✅ Bounded loss for liquidity provider</li>
              <li>✅ Works great with multiple outcomes</li>
              <li>⚠️ More complex math</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
