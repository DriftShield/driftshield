'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardNav } from '@/components/dashboard-nav';
import { getMarketPDA, getBetPDA, getVaultPDA, PROGRAM_ID, resolveMarket, BetOutcome } from '@/lib/solana/prediction-bets';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import IDL from '@/lib/solana/prediction_bets_idl.json';
import { LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';

export default function TestPayoutPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [marketId, setMarketId] = useState('');
  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [userBets, setUserBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const checkMarket = async () => {
    if (!marketId || !publicKey) return;

    setLoading(true);
    try {
      const [marketPDA] = getMarketPDA(marketId);

      const dummyWallet = {
        publicKey: PROGRAM_ID,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
      const program = new Program(IDL as any, provider);

      // Fetch market
      const marketData = await (program.account as any).market.fetch(marketPDA);

      setMarketInfo({
        pda: marketPDA.toBase58(),
        authority: marketData.authority.toBase58(),
        title: marketData.title,
        endTimestamp: new Date(marketData.endTimestamp.toNumber() * 1000).toLocaleString(),
        isResolved: marketData.isResolved,
        winningOutcome: marketData.winningOutcome?.yes ? 'YES' : marketData.winningOutcome?.no ? 'NO' : 'Not resolved',
        totalYesAmount: marketData.totalYesAmount.toNumber() / LAMPORTS_PER_SOL,
        totalNoAmount: marketData.totalNoAmount.toNumber() / LAMPORTS_PER_SOL,
        totalYesBets: marketData.totalYesBets.toNumber(),
        totalNoBets: marketData.totalNoBets.toNumber(),
      });

      // Fetch user's bets
      const betAccounts = await program.account.bet.all([
        {
          memcmp: {
            offset: 8,
            bytes: publicKey.toBase58(),
          }
        }
      ]);

      const bets = betAccounts
        .filter((b: any) => (b.account as any).market.toBase58() === marketPDA.toBase58())
        .map((bet: any, idx: number) => ({
          publicKey: bet.publicKey.toBase58(),
          outcome: (bet.account as any).outcome.yes ? 'YES' : 'NO',
          amount: (bet.account as any).amount.toNumber() / LAMPORTS_PER_SOL,
          timestamp: new Date((bet.account as any).timestamp.toNumber() * 1000).toLocaleString(),
          isClaimed: (bet.account as any).isClaimed,
          betIndex: idx,
        }));

      setUserBets(bets);

    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (outcome: 'YES' | 'NO') => {
    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect wallet');
      return;
    }

    try {
      const signature = await resolveMarket(
        connection,
        { publicKey, signTransaction, connected } as any,
        marketId,
        outcome === 'YES' ? BetOutcome.Yes : BetOutcome.No
      );

      alert(`Resolved! TX: ${signature}`);
      await checkMarket();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleClaimPayout = async (betPubkey: string, betIndex: number) => {
    if (!connected || !publicKey || !signTransaction) {
      alert('Please connect wallet');
      return;
    }

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, connected } as any,
        { commitment: 'confirmed' }
      );
      const program = new Program(IDL as any, provider);

      const [marketPDA] = getMarketPDA(marketId);
      const [vaultPDA] = getVaultPDA(marketPDA);

      const tx = await program.methods
        .claimPayout()
        .accounts({
          market: marketPDA,
          bet: betPubkey,
          vault: vaultPDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert(`Claimed! TX: ${tx}`);
      await checkMarket();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="lg:pl-64">
        <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
          <h1 className="text-3xl font-bold">Test Payout Debug Tool</h1>

          {!connected && (
            <Card className="p-6">
              <WalletMultiButton />
            </Card>
          )}

          <Card className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Market ID</label>
              <div className="flex gap-2">
                <Input
                  value={marketId}
                  onChange={(e) => setMarketId(e.target.value)}
                  placeholder="Enter market ID"
                />
                <Button onClick={checkMarket} disabled={loading || !connected}>
                  {loading ? 'Loading...' : 'Check'}
                </Button>
              </div>
            </div>
          </Card>

          {marketInfo && (
            <>
              <Card className="p-6 space-y-3">
                <h2 className="text-xl font-bold">Market Info</h2>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {JSON.stringify(marketInfo, null, 2)}
                </pre>

                {!marketInfo.isResolved && marketInfo.authority === publicKey?.toBase58() && (
                  <div className="flex gap-2">
                    <Button onClick={() => handleResolve('YES')} className="bg-green-600">
                      Resolve as YES
                    </Button>
                    <Button onClick={() => handleResolve('NO')} className="bg-red-600">
                      Resolve as NO
                    </Button>
                  </div>
                )}
              </Card>

              <Card className="p-6 space-y-3">
                <h2 className="text-xl font-bold">Your Bets ({userBets.length})</h2>
                {userBets.map((bet, idx) => {
                  const isWinner = marketInfo.isResolved &&
                    bet.outcome === marketInfo.winningOutcome;

                  return (
                    <div key={idx} className="p-3 border rounded space-y-2">
                      <div className="text-sm">
                        <strong>Outcome:</strong> {bet.outcome} |{' '}
                        <strong>Amount:</strong> {bet.amount} SOL |{' '}
                        <strong>Claimed:</strong> {bet.isClaimed ? 'Yes' : 'No'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Bet PubKey: {bet.publicKey}
                      </div>
                      {isWinner && !bet.isClaimed && (
                        <Button
                          onClick={() => handleClaimPayout(bet.publicKey, bet.betIndex)}
                          className="bg-green-600"
                          size="sm"
                        >
                          Claim Payout
                        </Button>
                      )}
                      {isWinner && bet.isClaimed && (
                        <div className="text-green-600 text-sm">✓ Already Claimed</div>
                      )}
                      {!isWinner && marketInfo.isResolved && (
                        <div className="text-red-600 text-sm">✗ Lost</div>
                      )}
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
