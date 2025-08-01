import SubscriptionStatus from '@/app/(pages)/success/subscription-status';

export const dynamic = 'force-dynamic';

export default function SuccessPage() {
  return (
    <main className="flex min-w-screen flex-col items-center justify-between">
      <SubscriptionStatus />
    </main>
  );
}
