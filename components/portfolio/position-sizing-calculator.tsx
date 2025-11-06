'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { calculatePositionSizing } from '@/lib/portfolio/calculator';
import { Position } from '@/lib/portfolio/types';

interface PositionSizingCalculatorProps {
  marketId: string;
  marketTitle: string;
  currentOdds: number; // e.g., 0.65 for 65%
  userBankroll: number;
  existingPositions: Position[];
}

export function PositionSizingCalculator({
  marketId,
  marketTitle,
  currentOdds,
  userBankroll,
  existingPositions,
}: PositionSizingCalculatorProps) {
  const [estimatedWinProbability, setEstimatedWinProbability] = useState(currentOdds);
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [showCalculation, setShowCalculation] = useState(false);

  const recommendation = calculatePositionSizing(
    marketTitle,
    marketId,
    currentOdds,
    estimatedWinProbability,
    userBankroll,
    existingPositions,
    riskTolerance
  );

  const hasEdge = estimatedWinProbability > currentOdds;
  const edge = estimatedWinProbability - currentOdds;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          <CardTitle>Position Sizing Calculator</CardTitle>
        </div>
        <CardDescription>
          Calculate optimal bet size using Kelly Criterion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Market Info */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Market</Label>
          <p className="text-sm text-muted-foreground">{marketTitle}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Market Odds</span>
            <span className="font-medium">{(currentOdds * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Estimated Win Probability */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="win-prob">Your Estimated Win Probability</Label>
            <span className="text-sm font-medium">{(estimatedWinProbability * 100).toFixed(1)}%</span>
          </div>
          <Slider
            id="win-prob"
            min={0}
            max={100}
            step={1}
            value={[estimatedWinProbability * 100]}
            onValueChange={(value) => setEstimatedWinProbability(value[0] / 100)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Adjust based on your research and analysis
          </p>
        </div>

        {/* Edge Indicator */}
        {hasEdge ? (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              <strong>Positive Edge: {(edge * 100).toFixed(1)}%</strong>
              <br />
              Your estimated probability is higher than market odds
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-500">
              <strong>No Edge Detected</strong>
              <br />
              Market odds are equal or better than your estimate
            </AlertDescription>
          </Alert>
        )}

        {/* Risk Tolerance */}
        <div className="space-y-3">
          <Label>Risk Tolerance</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={riskTolerance === 'conservative' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRiskTolerance('conservative')}
            >
              Conservative
            </Button>
            <Button
              variant={riskTolerance === 'moderate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRiskTolerance('moderate')}
            >
              Moderate
            </Button>
            <Button
              variant={riskTolerance === 'aggressive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRiskTolerance('aggressive')}
            >
              Aggressive
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {riskTolerance === 'conservative' && '1/4 Kelly (safest)'}
            {riskTolerance === 'moderate' && '1/2 Kelly (balanced)'}
            {riskTolerance === 'aggressive' && 'Full Kelly (highest growth)'}
          </p>
        </div>

        {/* Recommendation */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Suggested Position Size</span>
            <span className={`text-2xl font-bold ${
              recommendation.suggestedPosition === 0 ? 'text-red-500' : 'text-green-500'
            }`}>
              ${recommendation.suggestedPosition.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Max Recommended</span>
              <span>${recommendation.maxRecommendedSize.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Risk Level</span>
              <span className={`font-medium ${
                recommendation.riskLevel === 'high' ? 'text-red-500' :
                recommendation.riskLevel === 'medium' ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                {recommendation.riskLevel.toUpperCase()}
              </span>
            </div>
            {recommendation.kellyFraction !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kelly Fraction</span>
                <span>{(recommendation.kellyFraction * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Reasoning */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Analysis</Label>
            <ul className="space-y-1">
              {recommendation.reasoning.map((reason, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Advanced Details */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCalculation(!showCalculation)}
            className="w-full"
          >
            {showCalculation ? 'Hide' : 'Show'} Kelly Calculation Details
          </Button>

          {showCalculation && (
            <div className="space-y-2 text-xs bg-muted p-3 rounded-lg">
              <p className="font-medium">Kelly Criterion Formula:</p>
              <code className="block bg-background p-2 rounded">
                Kelly % = (Edge / Odds) = ({(edge * 100).toFixed(1)}% / {(currentOdds * 100).toFixed(1)}%)
              </code>
              <p className="text-muted-foreground mt-2">
                <strong>Where:</strong>
                <br />• Edge = Your Win Prob - Market Odds
                <br />• Odds = Market implied probability
                <br />• Applied {riskTolerance} multiplier: {
                  riskTolerance === 'conservative' ? '0.25x' :
                  riskTolerance === 'moderate' ? '0.5x' :
                  '1.0x'
                }
              </p>
            </div>
          )}
        </div>

        {/* Bankroll Context */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your Bankroll</span>
            <span className="font-medium">${userBankroll.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Position as % of Bankroll</span>
            <span className="font-medium">
              {((recommendation.suggestedPosition / userBankroll) * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Existing Positions</span>
            <span className="font-medium">{existingPositions.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
