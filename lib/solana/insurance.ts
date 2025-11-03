import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { getProgramIds, getUSDCMint } from './programIds';
import { getProvider, buildAndSendTransaction, TransactionResult } from './transactions';

export interface PurchasePolicyParams {
  modelPubkey: string;
  coverageAmount: number; // in USDC (base units)
  premium: number; // in USDC (base units)
  accuracyThreshold: number; // basis points (e.g., 8500 = 85%)
  durationDays: number;
}

export interface FileClaimParams {
  policyAddress: string;
  currentAccuracy: number; // basis points
}

/**
 * Purchase an insurance policy
 */
export async function purchaseInsurancePolicy(
  wallet: any,
  params: PurchasePolicyParams,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<TransactionResult> {
  try {
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');
    const usdcMint = getUSDCMint(network === 'devnet' ? 'devnet' : 'mainnet');

    // Derive PDA for policy
    const [policyPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('policy'),
        wallet.publicKey.toBuffer(),
        new PublicKey(params.modelPubkey).toBuffer(),
      ],
      programIds.insurance
    );

    // Get user's USDC token account
    const userTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      wallet.publicKey
    );

    // Insurance vault (you may need to create this or use a PDA)
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      programIds.insurance
    );

    const insuranceVault = await getAssociatedTokenAddress(usdcMint, vaultPDA, true);

    // Build instruction
    const instruction = {
      keys: [
        { pubkey: policyPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: insuranceVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: programIds.insurance,
      data: Buffer.from([]), // Encode params: model, coverage, premium, threshold, duration
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
 * File an insurance claim
 */
export async function fileInsuranceClaim(
  wallet: any,
  params: FileClaimParams,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<TransactionResult> {
  try {
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');
    const usdcMint = getUSDCMint(network === 'devnet' ? 'devnet' : 'mainnet');

    const policyPubkey = new PublicKey(params.policyAddress);

    // Get user's USDC token account
    const ownerTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      wallet.publicKey
    );

    // Insurance vault
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      programIds.insurance
    );

    const insuranceVault = await getAssociatedTokenAddress(usdcMint, vaultPDA, true);

    // Build claim instruction
    const instruction = {
      keys: [
        { pubkey: policyPubkey, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: insuranceVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: programIds.insurance,
      data: Buffer.from([]), // Encode current accuracy
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
 * Cancel an insurance policy
 */
export async function cancelInsurancePolicy(
  wallet: any,
  policyAddress: string,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): Promise<TransactionResult> {
  try {
    const programIds = getProgramIds(network === 'devnet' ? 'devnet' : 'mainnet');
    const usdcMint = getUSDCMint(network === 'devnet' ? 'devnet' : 'mainnet');

    const policyPubkey = new PublicKey(policyAddress);

    const ownerTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      wallet.publicKey
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      programIds.insurance
    );

    const insuranceVault = await getAssociatedTokenAddress(usdcMint, vaultPDA, true);

    const instruction = {
      keys: [
        { pubkey: policyPubkey, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: insuranceVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: programIds.insurance,
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
