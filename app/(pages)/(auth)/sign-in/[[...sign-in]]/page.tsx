'use client';

import { SignIn } from "@clerk/nextjs";

export const runtime = 'nodejs';

export default function SignInPage() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <SignIn />
        </div>
    );
}