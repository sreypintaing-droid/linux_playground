// import type { Metadata } from "next";
// import { Suspense } from "react";
// import { AuthForm } from "@/components/auth/auth-form";
// import { firebaseClientConfig } from "@/server/config";
// import { getSettings } from "@/server/services/settings";

// export const metadata: Metadata = { title: "Create account" };

// export default async function RegisterPage() {
//   const settings = await getSettings();
//   const firebase = firebaseClientConfig();
//   return (
//     <div>
//       <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
//       <p className="mb-8 mt-1 text-sm text-muted-foreground">You will get your own Ubuntu machine to practise on – nothing to install.</p>
//       {settings.registrationOpen ? (
//         <Suspense>
//           <AuthForm mode="register" firebase={firebase as never} demo={false} />
//         </Suspense>
//       ) : (
//         <p className="rounded-lg border bg-muted/40 p-4 text-sm">Registration is currently closed. Please ask your teacher or administrator for an account.</p>
//       )}
//     </div>
//   );
// }

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-gray-500">
          Sign in to continue to your Linux machine.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/15 p-3 text-sm text-red-500 border border-red-500/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="koemsourchan@gmail.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary py-2 text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="text-center text-sm">
        New to Linux Playground?{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}