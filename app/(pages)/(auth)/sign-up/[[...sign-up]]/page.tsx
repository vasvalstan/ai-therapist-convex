"use client"

import { SignUp } from "@clerk/nextjs";

export const runtime = 'nodejs';

export default function SignUpPage() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <SignUp />
        </div>
    );
}