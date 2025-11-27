import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import * as borsh from 'borsh';

// Program IDs
export const PROGRAM_IDS = {
  modelRegistry: new PublicKey('34HbFEsYeFa1NrdUyShWXKB36NZ5p4tCjogDbg2p98xm'),
  insurance: new PublicKey('2YbvCZwBSQN9Pe8hmcPDHk2MBCpwHk4tZ11WVuB7LXwC'),
  predictionMarket: new PublicKey('48g4cCBG7hnycaruM7GP5hH8Skfc7a43BrqNWpKX53Fh'),
};

// Instruction discriminators (first 8 bytes of sha256 hash of "global:instruction_name")
const DISCRIMINATORS = {
  registerModel: Buffer.from([111, 236, 93, 31, 195, 210, 142, 125]),
  purchasePolicy: Buffer.from([246, 226, 82, 107, 131, 219, 247, 45]),
  createMarket: Buffer.from([103, 226, 97, 235, 200, 188, 251, 254]),
  placeBet: Buffer.from([222, 62, 67, 220, 63, 166, 126, 33]),
};

// Borsh schema for instruction data
class RegisterModelArgs {
  model_id: string;
  name: string;
  model_type: string;
  framework: string;
  baseline_accuracy: bigint;

  constructor(fields: {
    model_id: string;
    name: string;
    model_type: string;
    framework: string;
    baseline_accuracy: bigint;
  }) {
    this.model_id = fields.model_id;
    this.name = fields.name;
    this.model_type = fields.model_type;
    this.framework = fields.framework;
    this.baseline_accuracy = fields.baseline_accuracy;
  }

  static schema = new Map([
    [
      RegisterModelArgs,
      {
        kind: 'struct',
        fields: [
          ['model_id', 'string'],
          ['name', 'string'],
          ['model_type', 'string'],
          ['framework', 'string'],
          ['baseline_accuracy', 'u64'],
        ],
      },
    ],
  ]);
}

class PurchasePolicyArgs {
  coverage_amount: bigint;
  premium: bigint;
  accuracy_threshold: bigint;
  duration_days: bigint;

  constructor(fields: {
    coverage_amount: bigint;
    premium: bigint;
    accuracy_threshold: bigint;
    duration_days: bigint;
  }) {
    this.coverage_amount = fields.coverage_amount;
    this.premium = fields.premium;
    this.accuracy_threshold = fields.accuracy_threshold;
    this.duration_days = fields.duration_days;
  }

  static schema = new Map([
    [
      PurchasePolicyArgs,
      {
        kind: 'struct',
        fields: [
          ['coverage_amount', 'u64'],
          ['premium', 'u64'],
          ['accuracy_threshold', 'u64'],
          ['duration_days', 'u64'],
        ],
      },
    ],
  ]);
}

class CreateMarketArgs {
  question: string;
  min_stake: bigint;
  resolution_time: bigint;

  constructor(fields: {
    question: string;
    min_stake: bigint;
    resolution_time: bigint;
  }) {
    this.question = fields.question;
    this.min_stake = fields.min_stake;
    this.resolution_time = fields.resolution_time;
  }

  static schema = new Map([
    [
      CreateMarketArgs,
      {
        kind: 'struct',
        fields: [
          ['question', 'string'],
          ['min_stake', 'u64'],
          ['resolution_time', 'i64'],
        ],
      },
    ],
  ]);
}

class PlaceBetArgs {
  outcome: boolean;
  amount: bigint;

  constructor(fields: { outcome: boolean; amount: bigint }) {
    this.outcome = fields.outcome;
    this.amount = fields.amount;
  }

  static schema = new Map([
    [
      PlaceBetArgs,
      {
        kind: 'struct',
        fields: [
          ['outcome', 'bool'],
          ['amount', 'u64'],
        ],
      },
    ],
  ]);
}

/**
 * Create instruction to register a model
 */
export function createRegisterModelInstruction(
  owner: PublicKey,
  modelId: string,
  name: string,
  modelType: string,
  framework: string,
  baselineAccuracy: number
): { instruction: TransactionInstruction; modelPDA: PublicKey } {
  // Derive model PDA
  const [modelPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('model'), owner.toBuffer(), Buffer.from(modelId)],
    PROGRAM_IDS.modelRegistry
  );

  // Serialize instruction data
  const args = new RegisterModelArgs({
    model_id: modelId,
    name: name,
    model_type: modelType,
    framework: framework,
    baseline_accuracy: BigInt(Math.floor(baselineAccuracy * 100)), // Convert to basis points
  });

  const instructionData = Buffer.concat([
    DISCRIMINATORS.registerModel,
    Buffer.from(borsh.serialize(RegisterModelArgs.schema, args)),
  ]);

  const keys = [
    { pubkey: modelPDA, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_IDS.modelRegistry,
    data: instructionData,
  });

  return { instruction, modelPDA };
}

/**
 * Create instruction to purchase insurance policy
 */
export function createPurchasePolicyInstruction(
  owner: PublicKey,
  modelPubkey: PublicKey,
  coverageAmount: number,
  premium: number,
  accuracyThreshold: number,
  durationDays: number
): { instruction: TransactionInstruction; policyPDA: PublicKey } {
  // Derive policy PDA
  const [policyPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('policy'), owner.toBuffer(), modelPubkey.toBuffer()],
    PROGRAM_IDS.insurance
  );

  // Serialize instruction data
  const args = new PurchasePolicyArgs({
    coverage_amount: BigInt(coverageAmount * 1_000_000), // Convert to 6 decimals (USDC)
    premium: BigInt(premium * 1_000_000),
    accuracy_threshold: BigInt(Math.floor(accuracyThreshold * 100)), // Basis points
    duration_days: BigInt(durationDays),
  });

  const instructionData = Buffer.concat([
    DISCRIMINATORS.purchasePolicy,
    Buffer.from(borsh.serialize(PurchasePolicyArgs.schema, args)),
  ]);

  const keys = [
    { pubkey: policyPDA, isSigner: false, isWritable: true },
    { pubkey: modelPubkey, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_IDS.insurance,
    data: instructionData,
  });

  return { instruction, policyPDA };
}

/**
 * Create instruction to create a prediction market
 */
export function createMarketInstruction(
  creator: PublicKey,
  modelPubkey: PublicKey,
  question: string,
  minStake: number,
  resolutionTime: Date
): { instruction: TransactionInstruction; marketPDA: PublicKey } {
  // Derive market PDA
  const [marketPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), creator.toBuffer(), modelPubkey.toBuffer()],
    PROGRAM_IDS.predictionMarket
  );

  // Serialize instruction data
  const args = new CreateMarketArgs({
    question: question,
    min_stake: BigInt(minStake * 1_000_000), // USDC 6 decimals
    resolution_time: BigInt(Math.floor(resolutionTime.getTime() / 1000)), // Unix timestamp
  });

  const instructionData = Buffer.concat([
    DISCRIMINATORS.createMarket,
    Buffer.from(borsh.serialize(CreateMarketArgs.schema, args)),
  ]);

  const keys = [
    { pubkey: marketPDA, isSigner: false, isWritable: true },
    { pubkey: modelPubkey, isSigner: false, isWritable: true },
    { pubkey: creator, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_IDS.predictionMarket,
    data: instructionData,
  });

  return { instruction, marketPDA };
}

/**
 * Create instruction to place a bet on a market
 */
export function createPlaceBetInstruction(
  bettor: PublicKey,
  marketPubkey: PublicKey,
  outcome: boolean,
  amount: number
): { instruction: TransactionInstruction; betPDA: PublicKey } {
  // Derive bet PDA
  const [betPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bet'), bettor.toBuffer(), marketPubkey.toBuffer()],
    PROGRAM_IDS.predictionMarket
  );

  // Serialize instruction data
  const args = new PlaceBetArgs({
    outcome: outcome,
    amount: BigInt(amount * 1_000_000), // USDC 6 decimals
  });

  const instructionData = Buffer.concat([
    DISCRIMINATORS.placeBet,
    Buffer.from(borsh.serialize(PlaceBetArgs.schema, args)),
  ]);

  const keys = [
    { pubkey: betPDA, isSigner: false, isWritable: true },
    { pubkey: marketPubkey, isSigner: false, isWritable: true },
    { pubkey: bettor, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_IDS.predictionMarket,
    data: instructionData,
  });

  return { instruction, betPDA };
}
