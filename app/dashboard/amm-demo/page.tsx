import { AMMDemo } from '@/components/amm/amm-demo';
import { DashboardNav } from '@/components/dashboard-nav';

export default function AMMDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="lg:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <AMMDemo />
        </div>
      </div>
    </div>
  );
}
