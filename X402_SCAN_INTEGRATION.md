# X402scan Integration Guide

## Overview

This project is **x402scan compliant**, enabling our endpoints to be:
- ✅ Listed on x402scan.com
- ✅ Invoked from the x402scan UI
- ✅ Automatically documented with schema validation

## Discovery Endpoint

**URL**: `https://your-domain.com/api/x402/discovery`

This endpoint returns metadata for all x402-protected resources in the x402scan validation schema format.

### Example Response

```json
{
  "x402Version": 1,
  "payer": "53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp",
  "accepts": [
    {
      "scheme": "exact",
      "network": "solana",
      "maxAmountRequired": "1000000",
      "resource": "/api/x402-bet",
      "description": "Place a bet on prediction market with USDC",
      "mimeType": "application/json",
      "payTo": "53syaxqneCrGxn516N36uj3m6Aa1ySLrj2hTiqqtFYPp",
      "maxTimeoutSeconds": 60,
      "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "outputSchema": {
        "input": {
          "type": "http",
          "method": "POST",
          "bodyType": "json",
          "bodyFields": {
            "marketId": {
              "type": "string",
              "required": true,
              "description": "ID of the prediction market"
            },
            "outcome": {
              "type": "string",
              "required": true,
              "enum": ["YES", "NO"],
              "description": "Predicted outcome"
            },
            "betAmount": {
              "type": "number",
              "required": true,
              "description": "Amount to bet in tokens"
            },
            "userWallet": {
              "type": "string",
              "required": true,
              "description": "User's Solana wallet address"
            }
          }
        },
        "output": {
          "type": "object",
          "properties": {
            "success": { "type": "boolean" },
            "authorization": {
              "type": "object",
              "properties": {
                "authorizationId": { "type": "string" },
                "marketId": { "type": "string" },
                "outcome": { "type": "string" },
                "betAmount": { "type": "number" },
                "timestamp": { "type": "number" },
                "expiresIn": { "type": "number" }
              }
            }
          }
        }
      },
      "extra": {
        "version": "1.0.0",
        "service": "DriftShield Prediction Markets",
        "betType": "binary",
        "minBetAmount": 0.01,
        "maxBetAmount": 10000
      }
    }
  ]
}
```

## Protected Endpoints

### 1. Place Bet (`/api/x402-bet`)

**Cost**: $1.00 USDC
**Method**: POST
**Description**: Place a bet on a prediction market

**Input Schema**:
```json
{
  "marketId": "string (required)",
  "outcome": "YES | NO (required)",
  "betAmount": "number (required)",
  "userWallet": "string (required)"
}
```

**Output Schema**:
```json
{
  "success": true,
  "authorization": {
    "authorizationId": "string",
    "marketId": "string",
    "outcome": "YES | NO",
    "betAmount": 10,
    "timestamp": 1234567890,
    "expiresIn": 300
  }
}
```

### 2. Create Market (`/api/x402/create-market`)

**Cost**: $5.00 USDC
**Method**: POST
**Description**: Create a new prediction market

**Input Schema**:
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "resolutionDate": "ISO 8601 string (required)",
  "category": "sports | politics | crypto | entertainment | other (optional)"
}
```

**Output Schema**:
```json
{
  "success": true,
  "marketId": "string",
  "transactionSignature": "string"
}
```

### 3. Premium Analytics (`/api/x402/analytics`)

**Cost**: $0.10 USDC
**Method**: GET
**Description**: Access premium market analytics

**Query Parameters**:
```
marketId: string (optional)
timeframe: 1h | 24h | 7d | 30d (optional)
```

**Output Schema**:
```json
{
  "totalVolume": "string",
  "activeUsers": 123,
  "marketTrends": [],
  "predictions": {}
}
```

## X402scan Validation Schema

Our implementation follows the stricter x402scan schema:

### Required Fields

```typescript
type Accepts = {
  scheme: "exact",                    // Payment scheme
  network: "solana",                  // Blockchain network
  maxAmountRequired: "1000000",       // Amount in atomic units
  resource: "/api/x402-bet",          // Endpoint path
  description: "...",                 // Human-readable description
  mimeType: "application/json",       // Response MIME type
  payTo: "wallet_address",            // Payment recipient
  maxTimeoutSeconds: 60,              // Payment timeout
  asset: "EPj...",                    // Token mint address (USDC)

  // Schema for UI invocation
  outputSchema?: {
    input: {
      type: "http",
      method: "GET" | "POST",
      bodyType?: "json" | "form-data" | ...,
      queryParams?: Record<string, FieldDef>,
      bodyFields?: Record<string, FieldDef>,
      headerFields?: Record<string, FieldDef>
    },
    output?: Record<string, any>
  },

  // Custom metadata
  extra?: Record<string, any>
}
```

### Field Definitions

```typescript
type FieldDef = {
  type?: string,              // Field type (string, number, boolean, etc.)
  required?: boolean,         // Is field required?
  description?: string,       // Human-readable description
  enum?: string[],           // Allowed values (for dropdowns)
  properties?: Record<...>   // Nested object properties
}
```

## Asset Addresses

### USDC on Solana
```
Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
Devnet:  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### Amount Encoding

Amounts are specified in **atomic units** (smallest denomination):

```typescript
// For USDC (6 decimals):
$1.00 = "1000000"
$0.10 = "100000"
$5.00 = "5000000"

// Formula: amount_in_dollars * 10^decimals
```

## Listing on x402scan

### Step 1: Deploy Your App

Ensure your discovery endpoint is publicly accessible:
```
https://your-domain.com/api/x402/discovery
```

### Step 2: Verify Schema

Test your discovery endpoint returns valid x402scan schema:
```bash
curl https://your-domain.com/api/x402/discovery | jq
```

### Step 3: Submit to x402scan

Visit [x402scan.com](https://x402scan.com) and submit your discovery endpoint.

### Step 4: Verification

x402scan will:
1. Fetch your discovery endpoint
2. Validate schema structure
3. Test endpoint accessibility
4. List your resources if valid

## Benefits of x402scan Compliance

### For Users
- 🎨 **UI Invocation**: Call endpoints from x402scan app
- 📋 **Auto-documentation**: See all parameters and expected outputs
- ✅ **Validation**: Type-safe inputs with enum dropdowns
- 🔍 **Discovery**: Find your APIs easily

### For Developers
- 📈 **Visibility**: Get listed on x402scan
- 🚀 **Adoption**: Users can try your API without coding
- 📊 **Analytics**: Track usage via x402scan
- 🛡️ **Standards**: Follow best practices

## Testing

### Test Discovery Endpoint

```bash
# Fetch discovery metadata
curl http://localhost:3000/api/x402/discovery | jq

# Verify schema compliance
curl http://localhost:3000/api/x402/discovery | \
  jq '.accepts[0] | keys'
```

### Test Protected Endpoint

```bash
# This should return 402 Payment Required
curl -X POST http://localhost:3000/api/x402-bet \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "test-market",
    "outcome": "YES",
    "betAmount": 10,
    "userWallet": "YOUR_WALLET_ADDRESS"
  }'
```

## Implementation Files

1. **lib/x402/types.ts** - Type definitions and helper functions
2. **app/api/x402/discovery/route.ts** - Discovery endpoint
3. **app/api/x402-bet/route.ts** - Protected bet endpoint
4. **middleware.ts** - X402 payment middleware

## Environment Variables

```bash
# Required
ADDRESS=your_solana_wallet_address
FACILITATOR_URL=https://facilitator.payai.network

# Optional
TREASURY_WALLET=your_solana_wallet_address  # Fallback for ADDRESS
```

## Next Steps

1. ✅ Discovery endpoint created
2. ✅ Schema compliance verified
3. ⏳ Deploy to production
4. ⏳ Submit to x402scan
5. ⏳ Monitor usage analytics

## Resources

- [x402scan Documentation](https://x402scan.com/docs)
- [X402 Protocol Spec](https://github.com/coinbase/x402)
- [PayAI Network](https://docs.payai.network)
- [Solana Token List](https://github.com/solana-labs/token-list)
