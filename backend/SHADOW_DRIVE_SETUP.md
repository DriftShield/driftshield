# Shadow Drive Integration Guide

## 🌟 Overview

DriftShield uses **Shadow Drive** by GenesysGo for decentralized, permanent storage of monitoring receipts. This ensures tamper-proof, verifiable records of model performance over time.

## 📦 What is Shadow Drive?

Shadow Drive is a decentralized storage solution built on Solana that offers:
- ✅ **Immutable Storage** - Files cannot be modified once uploaded
- ✅ **Permanent URLs** - Content-addressable storage with permanent links
- ✅ **Cheap Storage** - ~$0.80/GB/year (paid upfront)
- ✅ **Fast Access** - CDN-backed with low latency
- ✅ **On-Chain Proof** - Storage verified on Solana blockchain

## 🚀 Setup Guide

### 1. Install Shadow Drive SDK

The SDK is already included in `package.json`:
```json
"@shadow-drive/sdk": "^1.8.0"
```

Install dependencies:
```bash
npm install
```

### 2. Create Storage Account

You need a Shadow Drive storage account to upload files. Create one using the CLI or SDK:

#### Option A: Using Shadow Drive CLI

```bash
# Install Shadow Drive CLI
npm install -g @shadow-drive/cli

# Login with your Solana wallet
shdw-drive login

# Create storage account (e.g., 10GB)
shdw-drive create-storage-account \
  --name "driftshield-receipts" \
  --size 10GB

# This will output your storage account public key
# Example: 5fK...abc
```

#### Option B: Using the SDK programmatically

```javascript
const { ShdwDrive } = require('@shadow-drive/sdk');
const { Connection, Keypair } = require('@solana/web3.js');

async function createStorageAccount() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = Keypair.fromSecretKey(/* your secret key */);
  
  const drive = await new ShdwDrive(connection, wallet).init();
  
  const result = await drive.createStorageAccount(
    'driftshield-receipts',  // Name
    '10GB',                   // Size
  );
  
  console.log('Storage Account:', result.shdw_bucket);
  console.log('Transaction:', result.transaction_signature);
}
```

### 3. Configure Environment Variables

Add to your `.env` file:

```bash
# Shadow Drive Configuration
SHADOW_DRIVE_STORAGE_ACCOUNT=YOUR_STORAGE_ACCOUNT_PUBKEY_HERE
SHADOW_DRIVE_WALLET_PATH=/path/to/your/wallet.json

# Or use the oracle wallet
ORACLE_WALLET_PATH=~/.config/solana/id.json
```

### 4. Verify Setup

Test the Shadow Drive service:

```javascript
const shadowDriveService = require('./src/services/shadowDriveService');

async function test() {
  await shadowDriveService.initialize();
  
  if (shadowDriveService.isAvailable()) {
    console.log('✓ Shadow Drive is ready!');
    
    // Get storage info
    const info = await shadowDriveService.getStorageInfo();
    console.log('Storage info:', info);
  } else {
    console.log('✗ Shadow Drive not configured');
  }
}

test();
```

## 🔧 Usage

### Upload a Receipt

```javascript
const shadowDriveService = require('./src/services/shadowDriveService');

const receipt = {
  model_id: 'model-123',
  timestamp: new Date().toISOString(),
  metrics: { accuracy: 0.94, precision: 0.91 },
  drift_percentage: 3.5,
  receipt_hash: 'abc123...',
};

const result = await shadowDriveService.uploadReceipt(receipt, 'model-123');

console.log('Uploaded:', result.uploaded);
console.log('URL:', result.url);
console.log('Transaction:', result.signature);
```

### Download a Receipt

```javascript
const receipt = await shadowDriveService.downloadReceipt(url);
console.log('Receipt:', receipt);
```

### Verify Receipt Integrity

```javascript
const verification = await shadowDriveService.verifyReceipt(url, expectedHash);

if (verification.valid) {
  console.log('✓ Receipt is valid');
} else {
  console.log('✗ Receipt verification failed');
  console.log('Expected:', verification.expectedHash);
  console.log('Calculated:', verification.calculatedHash);
}
```

### List Files

```javascript
const files = await shadowDriveService.listFiles();
console.log('Files in storage:', files);
```

### Get Storage Info

```javascript
const info = await shadowDriveService.getStorageInfo();
console.log('Storage used:', info.storage);
console.log('Storage available:', info.storageAvailable);
```

## 📊 Storage Organization

Receipts are organized by model ID:

```
Shadow Drive Storage Account
└── receipts/
    ├── model-123/
    │   ├── 2025-01-15T10-30-00_abc12345.json
    │   ├── 2025-01-15T11-30-00_def67890.json
    │   └── ...
    ├── model-456/
    │   └── ...
    └── model-789/
        └── ...
```

## 💰 Cost Estimates

Shadow Drive pricing (as of 2024):
- **$0.80 per GB per year** (paid upfront)
- **No bandwidth fees**
- **No API call fees**

Example costs:
```
Receipt size: ~10 KB per receipt
Monitoring: Every hour for 1 model
Receipts per year: 24 × 365 = 8,760 receipts
Total size: 8,760 × 10 KB = ~88 MB

Cost per model per year: 88 MB × $0.80/GB = ~$0.07/year
```

For 1,000 models: ~$70/year

**Recommendation:** Start with 1-5 GB storage account (~$0.80-$4/year)

## 🛡️ Fallback Behavior

The service gracefully degrades if Shadow Drive is not configured:

1. **Not Configured:** Uses mock URLs (logged as warning)
2. **Upload Fails:** Returns mock URL (logged as error)
3. **Service Down:** Continues operation with mock URLs

This ensures the platform works even if Shadow Drive is temporarily unavailable.

## 🔐 Security Best Practices

### Wallet Security

The wallet used for Shadow Drive should:
- ✅ **Be separate** from your main platform wallet
- ✅ **Have minimal SOL** (just enough for transactions)
- ✅ **Use a dedicated keypair** for Shadow Drive operations
- ✅ **Be backed up** securely

### Generating a Dedicated Wallet

```bash
# Generate new keypair
solana-keygen new --outfile ~/.config/solana/shadow-drive.json

# Get public key
solana-keygen pubkey ~/.config/solana/shadow-drive.json

# Fund with small amount of SOL (~0.1 SOL)
solana transfer PUBKEY_HERE 0.1 --allow-unfunded-recipient
```

### Permissions

The Shadow Drive wallet needs:
- ✅ **Write access** to the storage account
- ✅ **SOL for fees** (~0.000005 SOL per upload)
- ❌ **No USDC needed** (storage is prepaid)

## 🔍 Monitoring

### Track Upload Success Rate

```javascript
// Add to your monitoring dashboard
const uploadStats = await db.one(`
  SELECT
    COUNT(*) as total_receipts,
    SUM(CASE WHEN shadow_drive_url LIKE 'https://shdw-drive.genesysgo.net/%' THEN 1 ELSE 0 END) as successful_uploads,
    AVG(CASE WHEN shadow_drive_url LIKE 'https://shdw-drive.genesysgo.net/%' THEN 1.0 ELSE 0.0 END) * 100 as upload_success_rate
  FROM monitoring_receipts
  WHERE timestamp > NOW() - INTERVAL '24 hours'
`);

console.log('Upload success rate:', uploadStats.upload_success_rate + '%');
```

### Alert on Upload Failures

Add to your cron jobs:

```javascript
// Check Shadow Drive health
async function checkShadowDriveHealth() {
  const recentFailures = await db.one(`
    SELECT COUNT(*) as failures
    FROM monitoring_receipts
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    AND shadow_drive_url NOT LIKE 'https://shdw-drive.genesysgo.net/%'
  `);
  
  if (recentFailures.failures > 10) {
    // Alert admins
    logger.error('High Shadow Drive failure rate!', { failures: recentFailures.failures });
    // Send notification
  }
}
```

## 🧪 Testing

### Test Upload

```javascript
const shadowDriveService = require('./src/services/shadowDriveService');

async function testUpload() {
  await shadowDriveService.initialize();
  
  const testReceipt = {
    model_id: 'test-model',
    timestamp: new Date().toISOString(),
    metrics: { accuracy: 0.95 },
    drift_percentage: 2.5,
    receipt_hash: 'test-hash-123',
  };
  
  const result = await shadowDriveService.uploadReceipt(testReceipt, 'test-model');
  
  console.log('Upload result:', result);
  
  if (result.uploaded) {
    // Test download
    const downloaded = await shadowDriveService.downloadReceipt(result.url);
    console.log('Downloaded:', downloaded);
    
    // Test verification
    const verified = await shadowDriveService.verifyReceipt(result.url, testReceipt.receipt_hash);
    console.log('Verified:', verified);
  }
}

testUpload();
```

## 📚 API Reference

### ShadowDriveService

#### Methods:

**`initialize()`**
- Initialize the Shadow Drive client
- Loads wallet and connects to Solana
- Automatically called on first use

**`uploadReceipt(receipt, modelId)`**
- Upload a monitoring receipt
- Returns: `{ url, signature, uploaded, filename }`

**`uploadReceiptsBatch(receipts, modelId)`**
- Upload multiple receipts
- Returns: Array of upload results

**`downloadReceipt(url)`**
- Download and parse receipt from URL
- Returns: Receipt object

**`verifyReceipt(url, expectedHash)`**
- Download and verify receipt integrity
- Returns: `{ valid, expectedHash, calculatedHash, receipt }`

**`deleteFile(url)`**
- Delete file from Shadow Drive
- Returns: `{ deleted, filename, signature }`

**`listFiles()`**
- List all files in storage account
- Returns: Array of file keys

**`getStorageInfo()`**
- Get storage account information
- Returns: Account details with storage stats

**`isAvailable()`**
- Check if Shadow Drive is initialized and available
- Returns: Boolean

## 🐛 Troubleshooting

### Issue: "Shadow Drive not initialized"

**Solution:**
```bash
# Check environment variables
echo $SHADOW_DRIVE_STORAGE_ACCOUNT
echo $SHADOW_DRIVE_WALLET_PATH

# Verify wallet exists
ls -la ~/.config/solana/id.json

# Check wallet has SOL
solana balance ~/.config/solana/id.json
```

### Issue: "Insufficient SOL for upload"

**Solution:**
```bash
# Get wallet public key
solana-keygen pubkey ~/.config/solana/id.json

# Send SOL to wallet
solana transfer PUBKEY_HERE 0.1
```

### Issue: "Storage account not found"

**Solution:**
```bash
# Verify storage account exists
shdw-drive get-storage-account YOUR_STORAGE_ACCOUNT_PUBKEY

# Or create a new one
shdw-drive create-storage-account --name driftshield --size 10GB
```

### Issue: Upload fails with "Account does not have enough storage"

**Solution:**
```javascript
// Add more storage to account
await shadowDriveService.addStorage('5GB');
```

## 🔗 Resources

- **Shadow Drive Docs:** https://docs.shadow.cloud
- **Shadow Drive SDK:** https://github.com/GenesysGo/shadow-drive
- **GenesysGo Discord:** https://discord.gg/genesysgo
- **Pricing Calculator:** https://shadow.cloud/pricing

## ✅ Verification Checklist

Before deploying to production:

- [ ] Shadow Drive storage account created
- [ ] Wallet funded with SOL (~0.5 SOL recommended)
- [ ] Environment variables set
- [ ] Test upload successful
- [ ] Test download successful
- [ ] Verification working
- [ ] Monitoring alerts configured
- [ ] Backup wallet keypair stored securely

## 💡 Best Practices

1. **Storage Planning:** Estimate your storage needs:
   - Average receipt size: ~10 KB
   - Receipts per model per year: `24 × 365 = 8,760`
   - Total per model: ~88 MB/year
   - Buffer: Add 50% for metadata and growth

2. **Wallet Management:**
   - Use a dedicated wallet for Shadow Drive
   - Keep it funded with ~0.5-1 SOL
   - Set up alerts when balance < 0.1 SOL

3. **Monitoring:**
   - Track upload success rate
   - Alert on failures
   - Monitor storage usage
   - Plan for storage expansion

4. **Naming Convention:**
   - Use organized folder structure
   - Include timestamps in filenames
   - Use model IDs for easy filtering

5. **Cleanup:**
   - Shadow Drive is immutable by default
   - Plan storage size accordingly
   - For mutable storage, you can delete old files

## 🎯 Production Checklist

```bash
# 1. Create production storage account
shdw-drive create-storage-account --name driftshield-prod --size 50GB

# 2. Save storage account pubkey
export SHADOW_DRIVE_STORAGE_ACCOUNT=<pubkey>

# 3. Fund wallet
solana transfer <wallet-pubkey> 1.0

# 4. Test upload
node -e "require('./src/services/shadowDriveService').initialize().then(s => console.log('✓ Ready'))"

# 5. Monitor
# Set up alerts for:
# - Upload failures
# - Low SOL balance
# - Storage capacity warnings
```

## 📈 Scaling Considerations

### Small Scale (< 100 models)
- **Storage:** 5-10 GB
- **Cost:** $4-8/year
- **Maintenance:** Minimal

### Medium Scale (100-1,000 models)
- **Storage:** 50-100 GB
- **Cost:** $40-80/year
- **Maintenance:** Monitor quarterly

### Large Scale (> 1,000 models)
- **Storage:** 500+ GB
- **Cost:** $400+/year
- **Maintenance:** 
  - Multiple storage accounts
  - Automated monitoring
  - Regular capacity planning

## 🔄 Migration from Mock to Production

If you've been using mock URLs during development:

```javascript
// Migration script
const { db } = require('./src/config/database');
const shadowDriveService = require('./src/services/shadowDriveService');

async function migrateMockReceipts() {
  // Get receipts with mock URLs
  const mockReceipts = await db.any(`
    SELECT * FROM monitoring_receipts
    WHERE shadow_drive_url LIKE 'https://shdw-drive.genesysgo.net/receipts/%'
    AND shadow_drive_url NOT LIKE '%' || $1 || '%'
  `, [process.env.SHADOW_DRIVE_STORAGE_ACCOUNT]);
  
  console.log(`Found ${mockReceipts.length} receipts to migrate`);
  
  for (const receipt of mockReceipts) {
    try {
      // Re-upload to real Shadow Drive
      const result = await shadowDriveService.uploadReceipt(receipt, receipt.model_id);
      
      if (result.uploaded) {
        // Update database with real URL
        await db.none(
          'UPDATE monitoring_receipts SET shadow_drive_url = $1 WHERE id = $2',
          [result.url, receipt.id]
        );
        
        console.log(`✓ Migrated receipt ${receipt.id}`);
      }
    } catch (error) {
      console.error(`✗ Failed to migrate receipt ${receipt.id}:`, error.message);
    }
  }
}

migrateMockReceipts();
```

## 🆘 Support

If you encounter issues:

1. **Check Shadow Drive status:** https://status.shadow.cloud
2. **GenesysGo Discord:** https://discord.gg/genesysgo
3. **DriftShield Support:** support@driftshield.io

---

**Shadow Drive integration is now production-ready!** ✅

All receipts will be:
- ✅ Stored immutably on Shadow Drive
- ✅ Accessible via permanent URLs
- ✅ Verifiable on-chain
- ✅ Available globally via CDN

