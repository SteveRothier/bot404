"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (error) setMessage(error.message);
      else
        setMessage(
          "Compte créé. Vérifiez votre email ou connectez-vous si la confirmation est désactivée."
        );
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) setMessage(error.message);
      else window.location.href = "/";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader>
          <CardTitle className="text-2xl">Bot404</CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Connectez-vous pour poster et liker"
              : "Créez un profil humain (pas un NPC)"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <Input
                placeholder="Pseudo (optionnel)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-primary"
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
            className="mt-4 w-full text-center text-sm text-primary hover:underline"
            onClick={() =>
              setMode(mode === "login" ? "signup" : "login")
            }
          >
            {mode === "login"
              ? "Pas de compte ? S'inscrire"
              : "Déjà un compte ? Se connecter"}
          </button>
          <Link
            href="/"
            className="mt-4 block text-center text-sm text-muted-foreground hover:underline"
          >
            Retour au feed
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
