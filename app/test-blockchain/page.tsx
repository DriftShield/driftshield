'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { getSolanaConnection } from '@/lib/solana/connection';
import { getProgramIds } from '@/lib/solana/programIds';
import { PublicKey } from '@solana/web3.js';
import { useBlockchainTransaction } from '@/hooks/useBlockchainTransaction';

export default function TestBlockchainPage() {
  const { connected, walletAddress, connect } = useWallet();
  const { loading, success, error, signature, executeTransaction, reset } = useBlockchainTransaction();

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [programsVerified, setProgramsVerified] = useState<any>({});
  const [testing, setTesting] = useState(false);

  // Test 1: Check Solana Connection
  const testSolanaConnection = async () => {
    try {
      const connection = getSolanaConnection('devnet');
      const version = await connection.getVersion();
      return { success: true, data: version };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Test 2: Check Wallet Balance
  const testWalletBalance = async () => {
    if (!walletAddress) return { success: false, error: 'No wallet connected' };

    try {
      const connection = getSolanaConnection('devnet');
      const publicKey = new PublicKey(walletAddress);
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / 1_000_000_000;
      setSolBalance(solBalance);
      return { success: true, data: `${solBalance} SOL` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Test 3: Verify Program Deployments
  const testProgramDeployments = async () => {
    try {
      const connection = getSolanaConnection('devnet');
      const programIds = getProgramIds('devnet');

      const results = {
        modelRegistry: false,
        insurance: false,
        predictionMarket: false,
      };

      // Check if programs exist on-chain
      const modelRegistryInfo = await connection.getAccountInfo(programIds.modelRegistry);
      results.modelRegistry = modelRegistryInfo !== null;

      const insuranceInfo = await connection.getAccountInfo(programIds.insurance);
      results.insurance = insuranceInfo !== null;

      const predictionMarketInfo = await connection.getAccountInfo(programIds.predictionMarket);
      results.predictionMarket = predictionMarketInfo !== null;

      setProgramsVerified(results);
      return { success: true, data: results };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Test 4: Test Transaction (Airdrop for testing)
  const testTransaction = async () => {
    if (!walletAddress) return { success: false, error: 'No wallet connected' };

    try {
      const connection = getSolanaConnection('devnet');
      const publicKey = new PublicKey(walletAddress);

      // Request airdrop (1 SOL)
      const signature = await connection.requestAirdrop(publicKey, 1_000_000_000);

      // Wait for confirmation
      await connection.confirmTransaction(signature);

      return { success: true, data: signature };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTesting(true);
    const results: any = {};

    console.log('🧪 Running Blockchain Tests...\n');

    // Test 1: Solana Connection
    console.log('Test 1: Solana Connection');
    const test1 = await testSolanaConnection();
    results.connection = test1;
    console.log(test1.success ? '✅ PASSED' : '❌ FAILED', test1);

    // Test 2: Wallet Balance
    console.log('\nTest 2: Wallet Balance');
    const test2 = await testWalletBalance();
    results.balance = test2;
    console.log(test2.success ? '✅ PASSED' : '❌ FAILED', test2);

    // Test 3: Program Deployments
    console.log('\nTest 3: Program Deployments');
    const test3 = await testProgramDeployments();
    results.programs = test3;
    console.log(test3.success ? '✅ PASSED' : '❌ FAILED', test3);

    console.log('\n📊 Test Results:', results);
    setTesting(false);
  };

  useEffect(() => {
    if (connected && walletAddress) {
      testWalletBalance();
      testProgramDeployments();
    }
  }, [connected, walletAddress]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">🔗 Blockchain Integration Test</h1>
          <p className="text-muted-foreground">Verify that all blockchain features are working correctly</p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-2xl font-bold mb-4">1. Wallet Connection</h2>
          {!connected ? (
            <div>
              <p className="text-muted-foreground mb-4">Connect your Phantom wallet to test blockchain features</p>
              <button
                onClick={connect}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span className="font-mono text-sm">{walletAddress}</span>
              </div>
              {solBalance !== null && (
                <p className="text-sm text-muted-foreground">
                  Balance: <span className="font-bold">{solBalance.toFixed(4)} SOL</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Program Verification */}
        {connected && (
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">2. Deployed Programs (Devnet)</h2>
            <div className="space-y-3">
              <ProgramStatus
                name="Model Registry"
                programId="34HbFEsYeFa1NrdUyShWXKB36NZ5p4tCjogDbg2p98xm"
                verified={programsVerified.modelRegistry}
              />
              <ProgramStatus
                name="Insurance"
                programId="2YbvCZwBSQN9Pe8hmcPDHk2MBCpwHk4tZ11WVuB7LXwC"
                verified={programsVerified.insurance}
              />
              <ProgramStatus
                name="Prediction Market"
                programId="APvSf7hDoZDyYgshb4LPm2mpBanbiWgdqJ53TKvKQ7Da"
                verified={programsVerified.predictionMarket}
              />
            </div>
          </div>
        )}

        {/* Network Info */}
        {connected && (
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">3. Network Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network:</span>
                <span className="font-mono">Solana Devnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RPC Endpoint:</span>
                <span className="font-mono text-xs">https://api.devnet.solana.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Explorer:</span>
                <a
                  href={`https://solscan.io/address/${walletAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-xs"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Test Actions */}
        {connected && (
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">4. Test Actions</h2>
            <div className="space-y-4">
              <button
                onClick={runAllTests}
                disabled={testing}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {testing ? 'Running Tests...' : '🧪 Run All Tests'}
              </button>

              <button
                onClick={async () => {
                  const result = await testTransaction();
                  if (result.success) {
                    alert(`✅ Airdrop successful!\nSignature: ${result.data}`);
                    testWalletBalance(); // Refresh balance
                  } else {
                    alert(`❌ Airdrop failed: ${result.error}`);
                  }
                }}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                💰 Request Devnet SOL Airdrop (1 SOL)
              </button>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Check browser console for detailed test results
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-2xl font-bold mb-4">📋 Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Connect your Phantom wallet (switch to Devnet in wallet settings)</li>
            <li>Verify all three programs show as deployed ✅</li>
            <li>Request devnet SOL if your balance is low</li>
            <li>Click "Run All Tests" to verify blockchain connectivity</li>
            <li>Check browser console (F12) for detailed test output</li>
            <li>Try the blockchain transaction example on the dashboard</li>
          </ol>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="/dashboard"
            className="p-4 bg-card border rounded-lg hover:bg-accent transition-colors"
          >
            <h3 className="font-bold mb-1">Dashboard →</h3>
            <p className="text-sm text-muted-foreground">View full application</p>
          </a>
          <a
            href="https://faucet.solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-card border rounded-lg hover:bg-accent transition-colors"
          >
            <h3 className="font-bold mb-1">Solana Faucet →</h3>
            <p className="text-sm text-muted-foreground">Get more devnet SOL</p>
          </a>
        </div>
      </div>
    </div>
  );
}

function ProgramStatus({ name, programId, verified }: { name: string; programId: string; verified: boolean }) {
  return (
    <div className="flex items-start justify-between p-3 bg-muted rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={verified ? 'text-green-500' : 'text-yellow-500'}>
            {verified ? '✅' : '⏳'}
          </span>
          <span className="font-semibold">{name}</span>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{programId}</p>
      </div>
      <a
        href={`https://solscan.io/address/${programId}?cluster=devnet`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 hover:underline"
      >
        View →
      </a>
    </div>
  );
}
