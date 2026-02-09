import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agents/auth";
import { getConnection } from "@/lib/agents/wallet";
import { PROGRAM_ID, getMarketPDA } from "@/lib/solana/prediction-bets";
import { MARKET_BLACKLIST } from "@/lib/constants/market-blacklist";
import IDL from "@/lib/solana/prediction_bets_idl.json";

export async function GET(request: NextRequest) {
  const { error, agent } = authenticateAgent(request);
  if (error || !agent) {
    return NextResponse.json({ success: false, error: error || "Unauthorized" }, { status: 401 });
  }

  try {
    const connection = getConnection();

    const programAccounts = await connection.getProgramAccounts(PROGRAM_ID);
    const { BorshAccountsCoder } = await import("@coral-xyz/anchor");
    const coder = new BorshAccountsCoder(IDL as any);

    const markets: any[] = [];

    for (const { pubkey, account } of programAccounts) {
      try {
        if (account.data.length < 8 || account.data.length > 10240) continue;

        const marketData = coder.decode("Market", account.data) as any;
        const numOutcomes = marketData.num_outcomes;
        if (numOutcomes === 0) continue;
        if (MARKET_BLACKLIST.has(marketData.market_id)) continue;

        const endTimestamp = marketData.end_timestamp.toNumber();
        const endDate = new Date(endTimestamp * 1000);
        const outcomeLabels = marketData.outcome_labels.slice(0, numOutcomes);

        let totalVolume = 0;
        const outcomeAmounts: number[] = [];
        for (let i = 0; i < numOutcomes; i++) {
          const amount = marketData.outcome_amounts[i].toNumber() / 1e9;
          totalVolume += amount;
          outcomeAmounts.push(amount);
        }

        const probabilities = outcomeAmounts.map((a) => (totalVolume > 0 ? a / totalVolume : 1 / numOutcomes));

        markets.push({
          market_id: marketData.market_id,
          title: marketData.title,
          outcomes: outcomeLabels,
          probabilities,
          outcome_volumes: outcomeAmounts,
          total_volume: totalVolume,
          end_date: endDate.toISOString(),
          is_active: endDate.getTime() > Date.now(),
          is_resolved: marketData.is_resolved,
          winning_outcome: marketData.winning_outcome ?? null,
          authority: marketData.authority.toBase58(),
          pda: pubkey.toBase58(),
          num_outcomes: numOutcomes,
        });
      } catch {
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      count: markets.length,
      markets,
    });
  } catch (err: any) {
    console.error("Error fetching markets:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch markets" }, { status: 500 });
  }
}
