'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, MessageSquare } from "lucide-react";
import Link from "next/link";
import { MultiOutcomeMarket, MarketOutcome } from "@/lib/types/market";
import { AgentThesisFeed } from "@/components/markets/agent-thesis-feed";

interface MultiOutcomeCardProps {
  market: MultiOutcomeMarket;
}

// Color palette for outcomes
const OUTCOME_COLORS = [
  { bar: "bg-green-500", text: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/5" },
  { bar: "bg-red-500", text: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/5" },
  { bar: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/5" },
  { bar: "bg-yellow-500", text: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/5" },
  { bar: "bg-purple-500", text: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/5" },
  { bar: "bg-orange-500", text: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/5" },
];

export function MultiOutcomeCard({ market }: MultiOutcomeCardProps) {
  const endDate = new Date(market.endDate);
  const daysUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const sortedOutcomes = [...market.outcomes].sort((a, b) => b.probability - a.probability);
  const displayOutcomes = sortedOutcomes.slice(0, 4);
  const remainingCount = market.totalOutcomes - displayOutcomes.length;

  return (
    <Card className="bg-zinc-950/80 border border-white/10 p-6 transition-all duration-300 cut-corners group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
        <div className="absolute top-2 right-2 w-8 h-px bg-transparent group-hover:bg-red-500/30 transition-colors" />
        <div className="absolute top-2 right-2 w-px h-8 bg-transparent group-hover:bg-red-500/30 transition-colors" />
      </div>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500 font-mono uppercase">
                {market.category}
              </Badge>
              <Badge variant="secondary" className="text-[10px] bg-zinc-900 text-zinc-400 border border-white/5 font-mono">
                {market.totalOutcomes} Outcomes
              </Badge>
              {market.volume > 100 && (
                <div className="flex items-center gap-1 text-[10px] text-orange-400 font-mono">
                  <TrendingUp className="w-3 h-3" />
                  <span>HIGH VOL</span>
                </div>
              )}
              <Badge className="text-[10px] bg-red-950/20 text-red-400 border border-red-500/20 font-mono">
                ON-CHAIN
              </Badge>
            </div>
            <h3 className="text-base md:text-lg font-bold text-white leading-tight font-heading">{market.question}</h3>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-zinc-600 font-mono uppercase">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>{daysUntilEnd > 0 ? `Ends in ${daysUntilEnd}d` : 'Ended'}</span>
              </div>
              <div>
                <span>Vol: {market.volume >= 1000 ? `$${(market.volume / 1000).toFixed(1)}K` : `$${market.volume.toFixed(0)}`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Outcome Probability Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-zinc-800 overflow-hidden flex" style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
            {sortedOutcomes.map((outcome, idx) => {
              const pct = (isNaN(outcome.probability) ? 0 : outcome.probability) * 100;
              const colorIdx = idx % OUTCOME_COLORS.length;
              return (
                <div
                  key={outcome.id || idx}
                  className={`h-full ${OUTCOME_COLORS[colorIdx].bar} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Outcomes */}
        <div className="space-y-2">
          {displayOutcomes.map((outcome, index) => (
            <OutcomeOption key={outcome.id || index} outcome={outcome} rank={index + 1} colorIdx={index} />
          ))}
          {remainingCount > 0 && (
            <div className="text-[10px] text-zinc-600 text-center py-2 border-t border-white/5 mt-3 font-mono">
              +{remainingCount} more outcome{remainingCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Compact Agent Theses */}
        <div className="border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare className="w-3 h-3 text-zinc-600" />
            <span className="text-[9px] font-mono text-zinc-600 uppercase">Agent Theses</span>
          </div>
          <AgentThesisFeed marketId={market.id} compact maxItems={2} />
        </div>

        <Button variant="outline" className="w-full font-mono uppercase text-xs tracking-wider cut-corners-sm" asChild>
          <Link href={`/dashboard/markets/${market.id}`}>
            View Market Data
          </Link>
        </Button>
      </div>
    </Card>
  );
}

interface OutcomeOptionProps {
  outcome: MarketOutcome;
  rank: number;
  colorIdx: number;
}

function OutcomeOption({ outcome, rank, colorIdx }: OutcomeOptionProps) {
  const probability = isNaN(outcome.probability) ? 0 : outcome.probability;
  const price = isNaN(outcome.price) ? 0 : outcome.price;
  const probabilityPercent = (probability * 100).toFixed(1);
  const priceDisplay = price.toFixed(0);
  const label = outcome.label || `Outcome ${rank}`;
  const colors = OUTCOME_COLORS[colorIdx % OUTCOME_COLORS.length];

  return (
    <div className={`p-3 border ${colors.border} ${colors.bg} transition-all duration-200 cut-corners-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono font-bold ${colors.text} opacity-60`}>#{rank}</span>
            <span className="text-sm font-bold text-white truncate font-mono">{label}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-4">
          {/* Mini probability bar */}
          <div className="w-16 h-1.5 bg-zinc-800 hidden sm:block">
            <div className={`h-full ${colors.bar} transition-all duration-500`} style={{ width: `${probability * 100}%` }} />
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${colors.text} font-mono`}>{probabilityPercent}%</div>
            <div className="text-[10px] text-zinc-500 font-mono">{priceDisplay}c</div>
          </div>
        </div>
      </div>
    </div>
  );
}
