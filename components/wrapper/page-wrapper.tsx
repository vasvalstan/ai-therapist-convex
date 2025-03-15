"use client"
import { api } from '@/convex/_generated/api';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { useEffect } from 'react';
import Footer from './footer';
import NavBar from './navbar';
import dynamic from 'next/dynamic';

// Create a client-only wrapper for authentication-dependent code
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const user = useQuery(api.users.getUser);
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    if (user && isSignedIn) {
      storeUser();
    }
  }, [user, isSignedIn, storeUser]);

  return <>{children}</>;
}

// Use dynamic import to avoid SSR for the auth wrapper
const DynamicAuthWrapper = dynamic(() => Promise.resolve(AuthWrapper), {
  ssr: false,
});

export default function PageWrapper({ children, requireAuth = false }: { children: React.ReactNode, requireAuth?: boolean }) {
  return (
    <>
      <NavBar />
      <main className="flex min-w-screen min-h-screen flex-col pt-[4rem] items-center dark:bg-black bg-white justify-between">
        <div className="absolute z-[-99] pointer-events-none inset-0 flex items-center justify-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        {requireAuth ? (
          <DynamicAuthWrapper>{children}</DynamicAuthWrapper>
        ) : (
          children
        )}
      </main>
      <Footer />
    </>
  )
}