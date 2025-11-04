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
    <Card className="glass p-6 hover:border-primary/50 transition-colors">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {market.category}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {market.totalOutcomes} Outcomes
              </Badge>
              {market.volume > 100 && (
                <div className="flex items-center gap-1 text-xs text-secondary">
                  <TrendingUp className="w-3 h-3" />
                  <span>High Volume</span>
                </div>
              )}
              <Badge variant="default" className="text-xs">
                Polymarket
              </Badge>
            </div>
            <h3 className="text-base md:text-lg font-semibold leading-tight">{market.question}</h3>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span>
                  {daysUntilEnd > 0
                    ? `Ends in ${daysUntilEnd}d`
                    : 'Ended'}
                </span>
              </div>
              <div>
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
            <OutcomeOption key={index} outcome={outcome} rank={index + 1} />
          ))}
          {remainingCount > 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              +{remainingCount} more outcome{remainingCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* View Details */}
        <Button variant="outline" className="w-full bg-transparent" asChild>
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
  const probabilityPercent = (outcome.probability * 100).toFixed(1);
  const priceDisplay = outcome.price;

  // Color based on rank
  const colorClass =
    rank === 1 ? 'border-primary/70 bg-primary/10' :
    rank === 2 ? 'border-secondary/70 bg-secondary/10' :
    'border-accent/70 bg-accent/10';

  const textColorClass =
    rank === 1 ? 'text-primary' :
    rank === 2 ? 'text-secondary' :
    'text-accent';

  return (
    <div className={`p-3 rounded-lg border-2 ${colorClass} transition-colors`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${textColorClass}`}>#{rank}</span>
            <span className="text-sm font-medium line-clamp-1">{outcome.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-lg font-bold ${textColorClass}`}>
              {priceDisplay}¢
            </div>
            <div className="text-[10px] text-muted-foreground">
              {probabilityPercent}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
