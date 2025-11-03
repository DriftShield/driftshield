import { RequireWallet } from "@/components/require-wallet";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireWallet>{children}</RequireWallet>;
}
