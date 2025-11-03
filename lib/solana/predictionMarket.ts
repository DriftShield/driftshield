import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { getProgramIds, getUSDCMint } from './programIds';
import { buildAndSendTransaction, TransactionResult } from './transactions';

export interface CreateMarketParams {
  modelPubkey: string;
  question: string;
  resolutionTime: number; // Unix timestamp
  minStake: number; // in USDC base units
}

export interface PlaceBetParams {
  marketAddress: string;
  outcome: boolean; // true = YES, false = NO
  amount: number; // in USDC base units
}

export interface ResolveMarketParams {
  marketAddress: string;
  winningOutcome: boolean;
}

/**
 * Create a prediction market
 */
export async function createPredictionMarket(
  wallet: any,
  params: CreateMarketParams,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<TransactionResult> {
  try {
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');

    // Derive market PDA
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('market'),
        wallet.publicKey.toBuffer(),
        new PublicKey(params.modelPubkey).toBuffer(),
      ],
      programIds.predictionMarket
    );

    // Build instruction
    const instruction = {
      keys: [
        { pubkey: marketPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: programIds.predictionMarket,
      data: Buffer.from([]), // Encode: model, question, resolutionTime, minStake
    };

    return await buildAndSendTransaction(wallet, [instruction as any]);
  } catch (error: any) {
    return {
      signature: '',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Place a bet on a prediction market
 */
export async function placeBet(
  wallet: any,
  params: PlaceBetParams,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<TransactionResult> {
  try {
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');
    const usdcMint = getUSDCMint(network === 'devnet' ? 'devnet' : 'mainnet');

    const marketPubkey = new PublicKey(params.marketAddress);

    // Derive position PDA
    const [positionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('position'),
        marketPubkey.toBuffer(),
        wallet.publicKey.toBuffer(),
      ],
      programIds.predictionMarket
    );

    // Get token accounts
    const userTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      wallet.publicKey
    );

    // Market vault (derive or create)
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), marketPubkey.toBuffer()],
      programIds.predictionMarket
    );

    const marketVault = await getAssociatedTokenAddress(usdcMint, vaultPDA, true);

    // Build bet instruction
    const instruction = {
      keys: [
        { pubkey: marketPubkey, isSigner: false, isWritable: true },
        { pubkey: positionPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: marketVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: programIds.predictionMarket,
      data: Buffer.from([]), // Encode: outcome, amount
    };

    return await buildAndSendTransaction(wallet, [instruction as any]);
  } catch (error: any) {
    return {
      signature: '',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Resolve a prediction market
 */
export async function resolveMarket(
  wallet: any,
  params: ResolveMarketParams,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<TransactionResult> {
  try {
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');

    const marketPubkey = new PublicKey(params.marketAddress);

    const instruction = {
      keys: [
        { pubkey: marketPubkey, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      ],
      programId: programIds.predictionMarket,
      data: Buffer.from([]), // Encode: winningOutcome
    };

    return await buildAndSendTransaction(wallet, [instruction as any]);
  } catch (error: any) {
    return {
      signature: '',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Claim winnings from a resolved market
 */
export async function claimWinnings(
  wallet: any,
  marketAddress: string,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<TransactionResult> {
  try {
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');
    const usdcMint = getUSDCMint(network === 'devnet' ? 'devnet' : 'mainnet');

    const marketPubkey = new PublicKey(marketAddress);

    const [positionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('position'),
        marketPubkey.toBuffer(),
        wallet.publicKey.toBuffer(),
      ],
      programIds.predictionMarket
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      wallet.publicKey
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), marketPubkey.toBuffer()],
      programIds.predictionMarket
    );

    const marketVault = await getAssociatedTokenAddress(usdcMint, vaultPDA, true);

    const instruction = {
      keys: [
        { pubkey: marketPubkey, isSigner: false, isWritable: true },
        { pubkey: positionPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: marketVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: programIds.predictionMarket,
      data: Buffer.from([]),
    };

    return await buildAndSendTransaction(wallet, [instruction as any]);
  } catch (error: any) {
    return {
      signature: '',
      success: false,
      error: error.message,
    };
  }
}
