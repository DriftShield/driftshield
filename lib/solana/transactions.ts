import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Signer,
  ConfirmOptions,
  TransactionSignature,
} from '@solana/web3.js';
import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import { getSolanaConnection } from './connection';
import { getProgramIds } from './programIds';

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

/**
 * Send and confirm a transaction
 */
export async function sendTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Signer[],
  options?: ConfirmOptions
): Promise<TransactionResult> {
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      signers,
      options
    );

    return {
      signature,
      success: true,
    };
  } catch (error: any) {
    console.error('Transaction failed:', error);
    return {
      signature: '',
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Build and send transaction with wallet adapter
 */
export async function buildAndSendTransaction(
  wallet: any,
  instructions: TransactionInstruction[],
  connection?: Connection
): Promise<TransactionResult> {
  try {
    const conn = connection || getSolanaConnection();
    const { blockhash } = await conn.getLatestBlockhash();

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: wallet.publicKey,
    });

    transaction.add(...instructions);

    // Sign transaction with wallet
    const signed = await wallet.signTransaction(transaction);

    // Send raw transaction
    const signature = await conn.sendRawTransaction(signed.serialize());

    // Confirm transaction
    await conn.confirmTransaction(signature, 'confirmed');

    return {
      signature,
      success: true,
    };
  } catch (error: any) {
    console.error('Transaction failed:', error);
    return {
      signature: '',
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  signature: string,
  connection?: Connection
): Promise<{
  confirmed: boolean;
  error?: string;
}> {
  try {
    const conn = connection || getSolanaConnection();
    const status = await conn.getSignatureStatus(signature);

    if (status.value === null) {
      return { confirmed: false, error: 'Transaction not found' };
    }

    if (status.value.err) {
      return {
        confirmed: false,
        error: JSON.stringify(status.value.err),
      };
    }

    return {
      confirmed: status.value.confirmationStatus === 'confirmed' ||
                 status.value.confirmationStatus === 'finalized',
    };
  } catch (error: any) {
    return {
      confirmed: false,
      error: error.message,
    };
  }
}

/**
 * Wait for transaction confirmation with timeout
 */
export async function waitForConfirmation(
  signature: string,
  connection?: Connection,
  timeout: number = 30000
): Promise<boolean> {
  const conn = connection || getSolanaConnection();
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const status = await getTransactionStatus(signature, conn);

    if (status.confirmed) {
      return true;
    }

    if (status.error && !status.error.includes('not found')) {
      throw new Error(status.error);
    }

    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Transaction confirmation timeout');
}

/**
 * Get Anchor provider from wallet
 */
export function getProvider(wallet: any, network: 'devnet' | 'mainnet-beta' = 'devnet') {
  const connection = getSolanaConnection(network);
  return new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  );
}

/**
 * Helper to convert number to BN
 */
export function toBN(value: number): BN {
  return new BN(value);
}

/**
 * Helper to format lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

/**
 * Helper to format SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
