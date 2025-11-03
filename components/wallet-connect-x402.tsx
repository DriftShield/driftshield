'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, CheckCircle2 } from 'lucide-react';

export function WalletConnectX402() {
  const { connected, publicKey, connecting } = useWallet();

  if (connecting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 animate-pulse" />
            Connecting Wallet...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (connected && publicKey) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Wallet Connected:</strong> {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
          <WalletMultiButton />
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect Your Wallet
        </CardTitle>
        <CardDescription>
          Connect your Solana wallet to test X402 micro-payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>

        <Alert>
          <AlertDescription className="text-sm">
            <strong>Don't have a wallet?</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>
                <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="underline">
                  Install Phantom
                </a>
              </li>
              <li>
                <a href="https://solflare.com/" target="_blank" rel="noopener noreferrer" className="underline">
                  Install Solflare
                </a>
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Make sure your wallet is connected to <strong>Devnet</strong> for testing!
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
