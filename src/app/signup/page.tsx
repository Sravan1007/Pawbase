"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joiningAsCaretaker, setJoiningAsCaretaker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // full_name flows into auth.users.raw_user_meta_data, which the
    // handle_new_user() trigger reads to populate profiles.full_name —
    // works whether or not email confirmation returns a session immediately.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      // A caretaker joining someone else's pet has nothing to onboard yet —
      // send them straight to the dashboard, which they'll see is empty
      // until an owner invites them. Someone who arrived via a "Book" CTA
      // (safeNext set) goes straight back to finish booking — that flow
      // creates the pet inline, so the separate onboarding detour would be
      // redundant.
      router.push(safeNext ?? (joiningAsCaretaker ? "/dashboard" : "/pets/new?onboarding=1"));
      router.refresh();
      return;
    }

    router.push(safeNext ? `/login?confirm=1&next=${encodeURIComponent(safeNext)}` : "/login?confirm=1");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🐾</div>
          <h1 className="page-title">Create your account</h1>
          <p className="page-subtitle">Set up Pet Passport for you and your pet.</p>
        </div>
        <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
          <label className="field-label">
            Full name
            <input
              type="text"
              required
              placeholder="Jamie Rivera"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </label>
          <label className="field-label">
            Email
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="field-label">
            Password
            <input
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          <label className="mt-1 flex items-start gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={joiningAsCaretaker}
              onChange={(e) => setJoiningAsCaretaker(e.target.checked)}
              className="mt-0.5"
            />
            I&apos;m joining as a caretaker for someone else&apos;s pet — skip pet setup
          </label>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-1">
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          Already have an account?{" "}
          <Link
            href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
