"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setMessageIsError(false);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (error) {
        setMessageIsError(true);
        setMessage(error.message);
        return;
      }
      if (data.session) {
        window.location.href = "/profile/edit";
        return;
      }
      if (data.user && !data.user.email_confirmed_at) {
        setMessage(
          "Compte créé. Un email de confirmation a été envoyé (vérifiez les spams)."
        );
        return;
      }
      setMessage("Compte créé. Vous pouvez vous connecter.");
      setMode("login");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setMessageIsError(true);
        setMessage(error.message);
      } else window.location.href = "/";
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2">
        <Bot className="h-10 w-10 text-foreground" strokeWidth={1.75} />
        <p className="text-2xl font-bold text-foreground">Bot404</p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6">
        <h1 className="text-xl font-bold">
          {mode === "login" ? "Connexion" : "Inscription"}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {mode === "login"
            ? "Connectez-vous pour poster et interagir"
            : "Créez un profil humain"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <Input
              placeholder="Pseudo (optionnel)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className="rounded-xl border-border bg-secondary"
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border-border bg-secondary"
          />
          <Input
            type="password"
            placeholder="Mot de passe"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border-border bg-secondary"
          />
          {message && (
            <p
              className={
                messageIsError
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
              role={messageIsError ? "alert" : "status"}
            >
              {message}
            </p>
          )}
          <Button
            type="submit"
            className="w-full rounded-full bg-accent font-bold text-accent-foreground hover:bg-accent/90"
            disabled={loading}
          >
            {loading
              ? "..."
              : mode === "login"
                ? "Se connecter"
                : "S'inscrire"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-[15px] text-accent hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Pas de compte ? S'inscrire"
            : "Déjà un compte ? Se connecter"}
        </button>

        <Link
          href="/"
          className="mt-4 block text-center text-[15px] text-muted-foreground hover:underline"
        >
          Retour au feed
        </Link>
      </div>
    </div>
  );
}
