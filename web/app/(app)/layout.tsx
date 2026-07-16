import { Sidebar } from '@/components/Sidebar';
import { AccountAlertBanner } from '@/components/AccountAlertBanner';
import { DemoBanner } from '@/components/DemoBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-6">
            <DemoBanner />
            {/* Banner chỉ hiện khi CÓ vấn đề. Không có vấn đề = không banner. */}
            <AccountAlertBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
