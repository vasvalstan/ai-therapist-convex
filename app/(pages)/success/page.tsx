import { Button } from '@/components/ui/button';
import NavBar from '@/components/wrapper/navbar';
import Link from 'next/link';
import SubscriptionStatus from './subscription-status';

export const dynamic = 'force-dynamic';

export default function SuccessPage() {
  return (
    <main className="flex min-w-screen flex-col items-center justify-between">
      <NavBar />
      <SubscriptionStatus />
    </main>
  );
}
