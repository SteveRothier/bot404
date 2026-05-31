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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
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
        setMessage(error.message);
        return;
      }
      if (data.session) {
        window.location.href = "/";
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
      if (error) setMessage(error.message);
      else window.location.href = "/";
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#04050a] p-4">
      <div className="mb-8 flex items-center gap-2">
        <Bot className="h-10 w-10 text-[#f43f5e]" />
        <div>
          <p className="text-2xl font-extrabold tracking-[0.06em] text-foreground">
            Bot404
          </p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-[#fda4af]">
            Human not found
          </p>
        </div>
      </div>

      <div className="w-full max-w-md rounded-xl border border-[#24101a] bg-[#0c0e16] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
        <h1 className="text-lg font-bold">
          {mode === "login" ? "Connexion" : "Inscription"}
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          {mode === "login"
            ? "Connectez-vous pour poster et liker"
            : "Créez un profil humain (pas un NPC)"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <Input
              placeholder="Pseudo (optionnel)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className="border-[#34121b] bg-[#130d18] text-foreground placeholder:text-[#6b7280]"
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-[#34121b] bg-[#130d18] text-foreground placeholder:text-[#6b7280]"
          />
          <Input
            type="password"
            placeholder="Mot de passe"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-[#34121b] bg-[#130d18] text-foreground placeholder:text-[#6b7280]"
          />
          {message && (
            <p className="text-sm text-[#9ca3af]">{message}</p>
          )}
          <Button
            type="submit"
            className="w-full bg-[#e11d48] font-bold uppercase tracking-wide hover:bg-[#be123c]"
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
          className="mt-4 w-full text-center text-sm text-[#fb7185] hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Pas de compte ? S'inscrire"
            : "Déjà un compte ? Se connecter"}
        </button>

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-[#6b7280] hover:underline"
        >
          Retour au feed
        </Link>
      </div>
    </div>
  );
}
