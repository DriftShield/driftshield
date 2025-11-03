'use client';

import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WalletButton() {
  const { connected, connecting, walletAddress, user, connect, disconnect, error } = useWallet();

  if (connected && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-sm">
            <div className="font-medium">{user.displayName}</div>
            <div className="text-xs text-muted-foreground">@{user.username}</div>
          </div>
          {user.balance && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-sm">
                <div className="font-medium">Balance</div>
                <div className="text-xs text-muted-foreground">
                  {(user.balance.available / 1e6).toFixed(2)} USDC
                </div>
              </div>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={disconnect} className="gap-2 text-red-600">
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={connect}
        disabled={connecting}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
