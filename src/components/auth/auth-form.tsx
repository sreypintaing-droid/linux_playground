"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiClientError } from "@/lib/api-client";

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
}

const loginSchema = z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(1, "Enter your password") });
const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
});

type FormValues = { name?: string; email: string; password: string };

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.89 0 3.15.8 3.87 1.49l2.64-2.54C16.84 3.38 14.65 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.54 0 9.21-3.9 9.21-9.38 0-.63-.07-1.11-.16-1.6H12z" />
    </svg>
  );
}

export function AuthForm({ mode, firebase, demo }: { mode: "login" | "register"; firebase: FirebaseClientConfig | null; demo: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";
  const form = useForm<FormValues>({ resolver: zodResolver(isRegister ? registerSchema : loginSchema) as never, defaultValues: { name: "", email: "", password: "" } });

  const done = (redirect: string) => {
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : redirect);
    router.refresh();
  };

  async function firebaseAuth(values: FormValues | null, google: boolean) {
    const { initializeApp, getApps } = await import("firebase/app");
    const auth = await import("firebase/auth");
    const app = getApps()[0] ?? initializeApp(firebase!);
    const fa = auth.getAuth(app);
    let cred;
    if (google) cred = await auth.signInWithPopup(fa, new auth.GoogleAuthProvider());
    else if (isRegister) {
      cred = await auth.createUserWithEmailAndPassword(fa, values!.email, values!.password);
      if (values!.name) await auth.updateProfile(cred.user, { displayName: values!.name });
    } else cred = await auth.signInWithEmailAndPassword(fa, values!.email, values!.password);
    const idToken = await cred.user.getIdToken(true);
    const res = await api<{ redirect: string }>("/api/auth/session", { body: { idToken, name: values?.name } });
    await auth.signOut(fa); // the app uses its own httpOnly session cookie
    return res;
  }

  function friendly(e: unknown): string {
    if (e instanceof ApiClientError) {
      if (typeof e.message === "string" && e.message !== "[object Object]") return e.message;
      const details = (e as { details?: { message?: string }; data?: { error?: { message?: string } | string } });
      if (typeof details.data?.error === "string") return details.data.error;
      if (details.data?.error?.message) return details.data.error.message;
      return JSON.stringify(e);
    }
    const code = (e as { code?: string })?.code ?? "";
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Incorrect email or password.";
    if (code.includes("email-already-in-use")) return "An account with this email already exists.";
    if (code.includes("popup-closed")) return "Google sign-in was cancelled.";
    if (code.includes("weak-password")) return "Please choose a stronger password.";
    return "Something went wrong. Please try again.";
  }
  async function onSubmit(values: FormValues) {
    setError(null);
    setBusy(true);
    try {
      const res = firebase ? await firebaseAuth(values, false) : await api<{ redirect: string }>(isRegister ? "/api/auth/register" : "/api/auth/login", { body: values });
      done(res.redirect);
    } catch (e) {
      setError(friendly(e));
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      const res = await firebaseAuth(null, true);
      done(res.redirect);
    } catch (e) {
      setError(friendly(e));
      setBusy(false);
    }
  }

  const errs = form.formState.errors;
  return (
    <div className="space-y-5">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {isRegister && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" autoComplete="name" placeholder="Ana Martins" {...form.register("name")} aria-invalid={!!errs.name} />
            {errs.name && <p className="text-xs text-destructive">{errs.name.message}</p>}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@school.edu" {...form.register("email")} aria-invalid={!!errs.email} />
          {errs.email && <p className="text-xs text-destructive">{errs.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} {...form.register("password")} aria-invalid={!!errs.password} />
          {errs.password && <p className="text-xs text-destructive">{errs.password.message}</p>}
        </div>
        {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : isRegister ? <UserPlus /> : <LogIn />}
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>
      {firebase && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="h-10 w-full" onClick={google} disabled={busy}>
            <GoogleIcon /> Continue with Google
          </Button>
        </>
      )}
      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? "Already have an account? " : "New to Linux Playground? "}
        <Link className="font-medium text-primary hover:underline" href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
      {demo && !isRegister && (
        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Development demo accounts</p>
          <div className="flex flex-wrap gap-2">
            {[
              ["Student", "student@linuxplayground.dev", "Student123!"],
              ["Teacher", "teacher@linuxplayground.dev", "Teacher123!"],
              ["Admin", "admin@linuxplayground.dev", "Admin123!"],
            ].map(([label, email, pw]) => (
              <Button
                key={label}
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => {
                  form.setValue("email", email);
                  form.setValue("password", pw);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
