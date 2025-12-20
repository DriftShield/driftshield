'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import { MultiOutcomeMarket, MarketOutcome } from "@/lib/types/market";

interface MultiOutcomeCardProps {
  market: MultiOutcomeMarket;
}

export function MultiOutcomeCard({ market }: MultiOutcomeCardProps) {
  const endDate = new Date(market.endDate);
  const daysUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Sort outcomes by probability descending
  const sortedOutcomes = [...market.outcomes].sort((a, b) => b.probability - a.probability);

  // Get top 3 outcomes to display
  const displayOutcomes = sortedOutcomes.slice(0, 3);
  const remainingCount = market.totalOutcomes - displayOutcomes.length;

  return (
    <Card className="glass-card p-6 hover:border-cyan-500/30 transition-all duration-300">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                {market.category}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-300 border-none">
                {market.totalOutcomes} Outcomes
              </Badge>
              {market.volume > 100 && (
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>High Volume</span>
                </div>
              )}
              <Badge className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                On-Chain
              </Badge>
            </div>
            <h3 className="text-base md:text-lg font-medium text-white leading-tight">{market.question}</h3>
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {daysUntilEnd > 0
                    ? `Ends in ${daysUntilEnd}d`
                    : 'Ended'}
                </span>
              </div>
              <div className="font-mono">
                <span>
                  Vol: {market.volume >= 1000
                    ? `$${(market.volume / 1000).toFixed(1)}K`
                    : `$${market.volume.toFixed(0)}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Outcomes Grid */}
        <div className="space-y-2">
          {displayOutcomes.map((outcome, index) => (
            <OutcomeOption key={outcome.id || index} outcome={outcome} rank={index + 1} />
          ))}
          {remainingCount > 0 && (
            <div className="text-xs text-zinc-600 text-center py-2 border-t border-white/5 mt-3">
              +{remainingCount} more outcome{remainingCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* View Details */}
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/dashboard/markets/${market.id}`}>
            View All Outcomes & Place Bet
          </Link>
        </Button>
      </div>
    </Card>
  );
}

interface OutcomeOptionProps {
  outcome: MarketOutcome;
  rank: number;
}

function OutcomeOption({ outcome, rank }: OutcomeOptionProps) {
  // Handle NaN and undefined values gracefully
  const probability = isNaN(outcome.probability) ? 0 : outcome.probability;
  const price = isNaN(outcome.price) ? 0 : outcome.price;
  const probabilityPercent = (probability * 100).toFixed(1);
  const priceDisplay = price.toFixed(0);
  const label = outcome.label || `Outcome ${rank}`;

  // Color based on rank - using cyan palette for consistency
  const colorClass =
    rank === 1 ? 'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20' :
    rank === 2 ? 'border-zinc-500/30 bg-zinc-500/5 hover:bg-zinc-500/10' :
    'border-zinc-600/20 bg-zinc-600/5 hover:bg-zinc-600/10';

  const textColorClass =
    rank === 1 ? 'text-cyan-400' :
    rank === 2 ? 'text-zinc-300' :
    'text-zinc-400';

  return (
    <div className={`p-3 border ${colorClass} transition-all duration-200 group cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-bold ${textColorClass} opacity-60`}>#{rank}</span>
            <span className="text-sm font-medium text-white truncate">{label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="text-right">
            <div className={`text-lg font-bold ${textColorClass}`}>
              {priceDisplay}¢
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              {probabilityPercent}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
