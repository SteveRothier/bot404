"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import {
  AuthBackLink,
  AuthShell,
} from "@/components/auth/AuthShell";
import {
  establishRecoverySession,
  isRecoveryHash,
} from "@/lib/auth/recovery-hash";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expiredFromUrl = searchParams.get("error") === "expired";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    expiredFromUrl
      ? "Lien expiré ou déjà utilisé. Demandez un nouveau lien."
      : null
  );
  const [messageIsError, setMessageIsError] = useState(expiredFromUrl);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(!expiredFromUrl);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (expiredFromUrl) {
      setCheckingSession(false);
      return;
    }

    const supabase = createClient();
    let settled = false;

    function finish(session: Session | null, errorMessage?: string) {
      if (settled) return;
      settled = true;
      setSessionReady(!!session);
      setUserEmail(session?.user.email ?? null);
      if (!session) {
        setMessageIsError(true);
        setMessage(
          errorMessage ??
            "Session invalide. Utilisez le lien reçu par email ou demandez-en un nouveau."
        );
      }
      setCheckingSession(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        finish(session);
      }
    });

    async function resolveSession() {
      if (isRecoveryHash(window.location.hash)) {
        const { session, error } = await establishRecoverySession(supabase);
        if (session) {
          finish(session);
          return;
        }
        finish(
          null,
          error?.message ??
            "Lien invalide ou expiré. Demandez un nouveau lien."
        );
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      finish(session);
    }

    void resolveSession();

    return () => subscription.unsubscribe();
  }, [expiredFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setMessageIsError(false);

    if (password.length < 6) {
      setMessageIsError(true);
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setMessageIsError(true);
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessageIsError(true);
      setMessage(error.message);
      return;
    }

    await supabase.auth.signOut();
    setMessageIsError(false);
    setMessage("Mot de passe mis à jour. Redirection vers la connexion…");
    window.setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1200);
  }

  const canSubmit = sessionReady && !expiredFromUrl && !checkingSession && !loading;

  const subtitle = userEmail
    ? `Réinitialiser le mot de passe pour ${userEmail}`
    : "Saisissez et confirmez votre nouveau mot de passe";

  return (
    <AuthShell
      title="Choisir un nouveau mot de passe"
      subtitle={subtitle}
      footer={
        <>
          <AuthBackLink href="/login">Demander un nouveau lien</AuthBackLink>
          <AuthBackLink href="/login">Retour à la connexion</AuthBackLink>
        </>
      }
    >
      {checkingSession ? (
        <p className="text-sm text-muted-foreground">Vérification du lien…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="password"
            label="Nouveau mot de passe"
            required
            minLength={6}
            value={password}
            disabled={!canSubmit}
            onChange={setPassword}
          />

          <PasswordInput
            id="confirm-password"
            label="Confirmer le mot de passe"
            required
            minLength={6}
            value={confirmPassword}
            disabled={!canSubmit}
            onChange={setConfirmPassword}
          />

          {message && (
            <p
              className={cn(
                "text-sm",
                messageIsError ? "text-destructive" : "text-muted-foreground"
              )}
              role={messageIsError ? "alert" : "status"}
            >
              {message}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-10 w-full rounded-md bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          >
            {loading ? "..." : "Enregistrer le mot de passe"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
