'use client';

import DesktopAdminPanel, { type OwnerDashboardData } from './DesktopAdminPanel';
import MobileToday from './MobileToday';

export interface TodayStatus {
  dateLabel: string;
  hasSales: boolean;
  slipCount: number;
}

export default function DashboardClient({
  storeName,
  today,
  owner,
}: {
  storeName: string | null;
  today: TodayStatus;
  owner: OwnerDashboardData;
}) {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div className="dashboard-inner">
        <DesktopAdminPanel storeName={storeName} data={owner} />
        <MobileToday
          storeName={storeName}
          today={today}
          reviewCount={owner.reviewCount}
          receiptDifferences={owner.receiptDifferences}
          monthlySales={owner.monthlySales}
          monthlyPurchase={owner.monthlyPurchase}
          monthlyExpense={owner.monthlyExpense}
        />
      </div>
    </div>
  );
}
