import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import IDL from './prediction_bets_idl.json';
import { getMarketPDA } from './prediction-bets';

/**
 * Auto-resolve a market using Switchboard oracle data
 * Should be called 24h after market end time
 */
export async function autoResolveMarket(
  connection: Connection,
  wallet: any,
  marketId: string,
  oracleFeed: PublicKey
) {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);
  const [marketPDA] = getMarketPDA(marketId);

  const tx = await program.methods
    .autoResolveMarket()
    .accounts({
      market: marketPDA,
      oracleFeed: oracleFeed,
    })
    .rpc();

  return tx;
}

/**
 * Dispute an oracle resolution
 * Must be called within 48h dispute period
 */
export async function disputeResolution(
  connection: Connection,
  wallet: any,
  marketId: string,
  reason: string
) {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);
  const [marketPDA] = getMarketPDA(marketId);

  const tx = await program.methods
    .disputeResolution(reason)
    .accounts({
      market: marketPDA,
      disputer: wallet.publicKey,
    })
    .rpc();

  return tx;
}

/**
 * Admin finalizes resolution after dispute
 * Only callable by market authority
 */
export async function adminFinalizeResolution(
  connection: Connection,
  wallet: any,
  marketId: string,
  outcome: 'Yes' | 'No'
) {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);
  const [marketPDA] = getMarketPDA(marketId);

  const betOutcome = outcome === 'Yes' ? { yes: {} } : { no: {} };

  const tx = await program.methods
    .adminFinalizeResolution(betOutcome)
    .accounts({
      market: marketPDA,
      authority: wallet.publicKey,
    })
    .rpc();

  return tx;
}

/**
 * Finalize oracle resolution after dispute period expires
 */
export async function finalizeOracleResolution(
  connection: Connection,
  wallet: any,
  marketId: string
) {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL as any, provider);
  const [marketPDA] = getMarketPDA(marketId);

  const tx = await program.methods
    .finalizeOracleResolution()
    .accounts({
      market: marketPDA,
    })
    .rpc();

  return tx;
}

/**
 * Parse resolution status from on-chain data
 */
export function parseResolutionStatus(resolutionStatus: any): string {
  if (!resolutionStatus) return 'Pending';

  const statusKey = Object.keys(resolutionStatus)[0];

  // Convert to PascalCase
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'oracleResolved': 'OracleResolved',
    'disputed': 'Disputed',
    'adminResolved': 'AdminResolved',
    'finalized': 'Finalized'
  };

  return statusMap[statusKey] || 'Pending';
}

/**
 * Check if user can dispute
 */
export function canDispute(resolutionStatus: string, disputeEndTime: number | null): boolean {
  if (resolutionStatus !== 'OracleResolved') return false;
  if (!disputeEndTime) return false;

  const now = Math.floor(Date.now() / 1000);
  return now < disputeEndTime;
}

/**
 * Get dispute time remaining in seconds
 */
export function getDisputeTimeRemaining(disputeEndTime: number | null): number {
  if (!disputeEndTime) return 0;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, disputeEndTime - now);
}
