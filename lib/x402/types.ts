/**
 * X402scan Validation Schema
 * Stricter schema than default x402 for UI presentation
 */

export type FieldDef = {
  type?: string;
  required?: boolean | string[];
  description?: string;
  enum?: string[];
  properties?: Record<string, FieldDef>; // for nested objects
};

export type Accepts = {
  scheme: "exact";
  network: "base" | "solana" | "base-sepolia" | "solana-devnet";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;

  // Schema describing input/output expectations for the paid endpoint
  outputSchema?: {
    input: {
      type: "http";
      method: "GET" | "POST";
      bodyType?: "json" | "form-data" | "multipart-form-data" | "text" | "binary";
      queryParams?: Record<string, FieldDef>;
      bodyFields?: Record<string, FieldDef>;
      headerFields?: Record<string, FieldDef>;
    };
    output?: Record<string, any>;
  };

  // Additional custom data
  extra?: Record<string, any>;
};

export type X402Response = {
  x402Version: number;
  error?: string;
  accepts?: Array<Accepts>;
  payer?: string;
};

/**
 * Helper to create x402scan-compliant response
 */
export function createX402Response(
  accepts: Accepts[],
  payer?: string,
  error?: string
): X402Response {
  return {
    x402Version: 1,
    accepts,
    payer,
    error,
  };
}

/**
 * Helper to create Accept object for bet endpoint
 */
export function createBetAccepts(
  payTo: string,
  resource: string = "/api/x402-bet"
): Accepts {
  return {
    scheme: "exact",
    network: "solana",
    maxAmountRequired: "1000000", // $1.00 USDC (6 decimals)
    resource,
    description: "Place a bet on prediction market with USDC",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 60,
    asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint on Solana

    outputSchema: {
      input: {
        type: "http",
        method: "POST",
        bodyType: "json",
        bodyFields: {
          marketId: {
            type: "string",
            required: true,
            description: "ID of the prediction market",
          },
          outcome: {
            type: "string",
            required: true,
            enum: ["YES", "NO"],
            description: "Predicted outcome",
          },
          betAmount: {
            type: "number",
            required: true,
            description: "Amount to bet in tokens",
          },
          userWallet: {
            type: "string",
            required: true,
            description: "User's Solana wallet address",
          },
        },
      },
      output: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          authorization: {
            type: "object",
            properties: {
              authorizationId: { type: "string" },
              marketId: { type: "string" },
              outcome: { type: "string" },
              betAmount: { type: "number" },
              timestamp: { type: "number" },
              expiresIn: { type: "number" },
            },
          },
        },
      },
    },

    extra: {
      version: "1.0.0",
      service: "DriftShield Prediction Markets",
      betType: "binary",
      minBetAmount: 0.01,
      maxBetAmount: 10000,
    },
  };
}

/**
 * Helper for market creation endpoint
 */
export function createMarketAccepts(
  payTo: string,
  resource: string = "/api/x402/create-market"
): Accepts {
  return {
    scheme: "exact",
    network: "solana",
    maxAmountRequired: "5000000", // $5.00 USDC
    resource,
    description: "Create a new prediction market",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 60,
    asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC

    outputSchema: {
      input: {
        type: "http",
        method: "POST",
        bodyType: "json",
        bodyFields: {
          title: {
            type: "string",
            required: true,
            description: "Market title/question",
          },
          description: {
            type: "string",
            required: false,
            description: "Detailed market description",
          },
          resolutionDate: {
            type: "string",
            required: true,
            description: "ISO 8601 date when market resolves",
          },
          category: {
            type: "string",
            required: false,
            enum: ["sports", "politics", "crypto", "entertainment", "other"],
            description: "Market category",
          },
        },
      },
      output: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          marketId: { type: "string" },
          transactionSignature: { type: "string" },
        },
      },
    },

    extra: {
      version: "1.0.0",
      service: "DriftShield Prediction Markets",
      marketType: "binary",
    },
  };
}

/**
 * Helper for analytics endpoint
 */
export function createAnalyticsAccepts(
  payTo: string,
  resource: string = "/api/x402/analytics"
): Accepts {
  return {
    scheme: "exact",
    network: "solana",
    maxAmountRequired: "100000", // $0.10 USDC
    resource,
    description: "Access premium market analytics and insights",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 30,
    asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC

    outputSchema: {
      input: {
        type: "http",
        method: "GET",
        queryParams: {
          marketId: {
            type: "string",
            required: false,
            description: "Specific market ID (optional, returns global analytics if omitted)",
          },
          timeframe: {
            type: "string",
            required: false,
            enum: ["1h", "24h", "7d", "30d"],
            description: "Analytics timeframe",
          },
        },
      },
      output: {
        type: "object",
        properties: {
          totalVolume: { type: "string" },
          activeUsers: { type: "number" },
          marketTrends: { type: "array" },
          predictions: { type: "object" },
        },
      },
    },

    extra: {
      version: "1.0.0",
      service: "DriftShield Prediction Markets",
      dataSource: "on-chain",
    },
  };
}
