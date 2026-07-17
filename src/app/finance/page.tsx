import { MarketInsightsWidget } from "@/components/market-insights-widget";

export const dynamic = 'force-dynamic';

export default function FinancePage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="max-w-2xl mx-auto">
          <MarketInsightsWidget />
      </div>
    </div>
  );
}
