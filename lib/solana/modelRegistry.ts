import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { getProgramIds } from './programIds';
import { getProvider, buildAndSendTransaction, TransactionResult } from './transactions';

export interface RegisterModelParams {
  modelId: string;
  metadata: string;
  initialAccuracy: number;
}

export interface UpdateAccuracyParams {
  modelId: string;
  newAccuracy: number;
}

/**
 * Register a new model on-chain
 */
export async function registerModel(
  wallet: any,
  params: RegisterModelParams,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<TransactionResult> {
  try {
    const provider = getProvider(wallet, network);
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');

    // Derive PDA for model account
    const [modelPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('model'), Buffer.from(params.modelId)],
      programIds.modelRegistry
    );

    // Create instruction (you'll need to load the IDL)
    // For now, this is a placeholder showing the structure
    const instruction = {
      keys: [
        { pubkey: modelPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: programIds.modelRegistry,
      data: Buffer.from([]), // Encode instruction data based on IDL
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
 * Update model accuracy on-chain
 */
export async function updateModelAccuracy(
  wallet: any,
  params: UpdateAccuracyParams,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<TransactionResult> {
  try {
    const provider = getProvider(wallet, network);
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');

    const [modelPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('model'), Buffer.from(params.modelId)],
      programIds.modelRegistry
    );

    // Create update instruction
    const instruction = {
      keys: [
        { pubkey: modelPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      ],
      programId: programIds.modelRegistry,
      data: Buffer.from([]), // Encode with new accuracy
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
 * Get model data from chain
 */
export async function getModelData(
  modelId: string,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<any> {
  try {
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');

    const [modelPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('model'), Buffer.from(modelId)],
      programIds.modelRegistry
    );

    // Fetch account data (needs connection and deserialization)
    return {
      address: modelPDA.toString(),
      // Add deserialized data once IDL is available
    };
  } catch (error) {
    console.error('Failed to fetch model data:', error);
    return null;
  }
}
