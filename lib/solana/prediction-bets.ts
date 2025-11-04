/**
 * Solana Program SDK for Prediction Bets
 * Interacts with the on-chain prediction_bets program
 */

import {
  PublicKey,
  Connection,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { AnchorProvider, Program, BN, web3 } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import IDL from './prediction_bets_idl.json';

// Program ID (deployed to devnet) - Actual deployed program from IDL
export const PROGRAM_ID = new PublicKey('BQtqZ6H72cbMjmSzm6Bv5zKYBF9a6ZwCnbZJNYWNK1xj');

// IDL type for our program
export type PredictionBetsIDL = {
  version: string;
  name: string;
  instructions: any[];
  accounts: any[];
  types: any[];
  errors: any[];
};

// Maximum number of outcomes supported
export const MAX_OUTCOMES = 10;

export interface MarketAccount {
  authority: PublicKey;
  marketId: string;
  title: string;
  endTimestamp: BN;
  numOutcomes: number;
  outcomeLabels: string[];
  outcomeBetCounts: BN[];
  outcomeAmounts: BN[];
  isResolved: boolean;
  winningOutcome: number | null;
  oracleFeed: PublicKey | null;
  autoResolutionTime: BN | null;
  resolutionStatus: any;
  disputed: boolean;
  disputeEndTime: BN | null;
  disputeReason: string;
  bump: number;
}

export interface BetAccount {
  user: PublicKey;
  market: PublicKey;
  marketId: string;
  outcomeIndex: number;
  amount: BN;
  timestamp: BN;
  betIndex: BN;
  isClaimed: boolean;
  bump: number;
}

/**
 * Get the PDA for a market account
 */
export function getMarketPDA(marketId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(marketId)],
    PROGRAM_ID
  );
}

/**
 * Get the PDA for a bet account
 */
export function getBetPDA(
  marketPubkey: PublicKey,
  userPubkey: PublicKey,
  betIndex: number
): [PublicKey, number] {
  // Convert bet index to 8-byte little-endian buffer
  const indexBuffer = Buffer.alloc(8);
  const bn = new BN(betIndex);
  bn.toArrayLike(Buffer, 'le', 8).copy(indexBuffer);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('bet'),
      marketPubkey.toBuffer(),
      userPubkey.toBuffer(),
      indexBuffer,
    ],
    PROGRAM_ID
  );
}

/**
 * Get the PDA for the market vault
 */
export function getVaultPDA(marketPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), marketPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Get Anchor Program instance
 */
function getProgram(connection: Connection, wallet: WalletContextState) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  );

  return new Program(IDL as any, provider);
}

/**
 * Initialize a new market on-chain (supports both binary and multi-outcome)
 * For binary: outcomes = ['Yes', 'No']
 * For multi: outcomes = ['Option A', 'Option B', 'Option C', ...]
 */
export async function initializeMarket(
  connection: Connection,
  wallet: WalletContextState,
  marketId: string,
  title: string,
  outcomes: string[],
  endTimestamp: number,
  oracleFeed?: PublicKey
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  if (outcomes.length < 2 || outcomes.length > MAX_OUTCOMES) {
    throw new Error(`Market must have between 2 and ${MAX_OUTCOMES} outcomes`);
  }

  const program = getProgram(connection, wallet);
  const [marketPDA] = getMarketPDA(marketId);

  const tx = await program.methods
    .initializeMarket(marketId, title, outcomes, new BN(endTimestamp), oracleFeed || null)
    .accounts({
      market: marketPDA,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Place a bet on a market (auto-initializes market if needed)
 * For binary markets: outcomeIndex = 0 (Yes) or 1 (No)
 * For multi-outcome: outcomeIndex = 0..N
 */
export async function placeBet(
  connection: Connection,
  wallet: WalletContextState,
  marketId: string,
  outcomeIndex: number,
  amountSOL: number,
  marketEndDate?: string,
  marketTitle?: string,
  outcomes?: string[]
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [marketPDA] = getMarketPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketPDA);
  const program = getProgram(connection, wallet);

  // Check if market exists, if not initialize it
  let marketData;
  try {
    marketData = await (program.account as any).market.fetch(marketPDA);

    // Validate outcome index
    if (outcomeIndex >= marketData.numOutcomes) {
      throw new Error(`Invalid outcome index. Market has ${marketData.numOutcomes} outcomes.`);
    }

    // Check if market has expired on-chain
    const currentTime = Math.floor(Date.now() / 1000);
    const endTimestamp = marketData.endTimestamp.toNumber();

    if (currentTime >= endTimestamp) {
      throw new Error(`This market closed on ${new Date(endTimestamp * 1000).toLocaleDateString()}. Please choose an active market with a future end date.`);
    }
  } catch (error: any) {
    // If error message contains our expiration message, re-throw it
    if (error.message?.includes('market closed') || error.message?.includes('Invalid outcome')) {
      throw error;
    }

    console.log('Market not found on-chain, initializing...');

    // Use provided end date or default to 1 year from now
    let endTimestamp: number;
    if (marketEndDate) {
      endTimestamp = Math.floor(new Date(marketEndDate).getTime() / 1000);
      console.log('Using Polymarket end date:', new Date(endTimestamp * 1000).toLocaleDateString());
    } else {
      endTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      console.log('Using default 1-year end date');
    }

    const title = marketTitle || `Market ${marketId}`;
    const marketOutcomes = outcomes || ['Yes', 'No']; // Default to binary

    try {
      await initializeMarket(
        connection,
        wallet,
        marketId,
        title.slice(0, 200), // Limit to 200 chars
        marketOutcomes,
        endTimestamp,
        undefined // No oracle feed for now
      );
      console.log('Market initialized successfully');

      // Fetch the newly initialized market
      marketData = await (program.account as any).market.fetch(marketPDA);
    } catch (initError) {
      console.error('Failed to initialize market:', initError);
      throw new Error('Failed to initialize market on-chain. Please try again.');
    }
  }

  const amount = new BN(amountSOL * LAMPORTS_PER_SOL);

  // Calculate bet index from market data (sum of all outcome bet counts)
  let betIndex = 0;
  for (let i = 0; i < marketData.numOutcomes; i++) {
    betIndex += marketData.outcomeBetCounts[i].toNumber();
  }

  const [betPDA] = getBetPDA(marketPDA, wallet.publicKey, betIndex);

  try {
    const tx = await program.methods
      .placeBet(marketId, outcomeIndex, amount, new BN(betIndex))
      .accounts({
        market: marketPDA,
        bet: betPDA,
        vault: vaultPDA,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  } catch (error: any) {
    // Better error handling for MarketClosed
    if (error.message?.includes('MarketClosed') || error.message?.includes('Market has already closed')) {
      throw new Error('This market has expired and is no longer accepting bets. Please choose an active market.');
    }
    throw error;
  }
}

/**
 * Fetch all bets for a user on a specific market
 */
export async function getUserBetsForMarket(
  connection: Connection,
  userPubkey: PublicKey,
  marketId: string
): Promise<BetAccount[]> {
  const [marketPDA] = getMarketPDA(marketId);

  // Get all program accounts that are bets
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: userPubkey.toBase58(),
        },
      },
      {
        memcmp: {
          offset: 8 + 32, // After discriminator + user pubkey
          bytes: marketPDA.toBase58(),
        },
      },
    ],
  });

  // Parse bet accounts (would need proper deserialization with Anchor)
  const bets: BetAccount[] = [];

  for (const account of accounts) {
    // Simplified parsing - in production, use Anchor's deserialization
    const data = account.account.data;

    // This is a placeholder structure
    const bet: BetAccount = {
      user: new PublicKey(data.slice(8, 40)),
      market: new PublicKey(data.slice(40, 72)),
      marketId: '', // Would parse string
      outcomeIndex: 0, // Would parse index
      amount: new BN(data.slice(0, 8), 'le'),
      timestamp: new BN(0),
      betIndex: new BN(0),
      isClaimed: false,
      bump: 0,
    };

    bets.push(bet);
  }

  return bets;
}

/**
 * Fetch all bets for a user across all markets
 */
export async function getAllUserBets(
  connection: Connection,
  userPubkey: PublicKey
): Promise<BetAccount[]> {
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 8,
          bytes: userPubkey.toBase58(),
        },
      },
    ],
  });

  // Parse and return bets (simplified)
  return [];
}

/**
 * Resolve a market (admin only)
 * For binary: winningOutcomeIndex = 0 (Yes) or 1 (No)
 * For multi: winningOutcomeIndex = 0..N
 */
export async function resolveMarket(
  connection: Connection,
  wallet: WalletContextState,
  marketId: string,
  winningOutcomeIndex: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const program = getProgram(connection, wallet);
  const [marketPDA] = getMarketPDA(marketId);

  const tx = await program.methods
    .resolveMarket(winningOutcomeIndex)
    .accounts({
      market: marketPDA,
      authority: wallet.publicKey,
    })
    .rpc();

  return tx;
}

/**
 * Claim payout for a winning bet
 */
export async function claimPayout(
  connection: Connection,
  wallet: WalletContextState,
  marketId: string,
  betIndex: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const program = getProgram(connection, wallet);
  const [marketPDA] = getMarketPDA(marketId);
  const [betPDA] = getBetPDA(marketPDA, wallet.publicKey, betIndex);
  const [vaultPDA] = getVaultPDA(marketPDA);

  const tx = await program.methods
    .claimPayout()
    .accounts({
      market: marketPDA,
      bet: betPDA,
      vault: vaultPDA,
      user: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Emergency withdrawal - only for market authority, only after 30 days
 */
export async function emergencyWithdraw(
  connection: Connection,
  wallet: WalletContextState,
  marketId: string,
  amountLamports: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const program = getProgram(connection, wallet);
  const [marketPDA] = getMarketPDA(marketId);
  const [vaultPDA] = getVaultPDA(marketPDA);

  const tx = await program.methods
    .emergencyWithdraw(new BN(amountLamports))
    .accounts({
      market: marketPDA,
      vault: vaultPDA,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}
