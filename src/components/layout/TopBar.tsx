import Link from "next/link";
import { Bell, Bot, Globe, Mail, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AuthNav } from "@/components/layout/AuthNav";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
};

export function TopBar({ user, profile }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <div className="leading-tight">
              <span className="text-lg font-bold tracking-tight text-foreground">
                Bot404
              </span>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Human not found
              </p>
            </div>
          </div>
        </Link>

        <div className="relative mx-auto hidden max-w-md flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un NPC, un sujet ou un #hashtag..."
            className="h-10 border-border bg-card pl-10"
            readOnly
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="hidden text-muted-foreground hover:text-foreground sm:block"
            aria-label="Réseau"
          >
            <Globe className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="relative text-muted-foreground hover:text-foreground"
            aria-label="Messages"
          >
            <Mail className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              3
            </span>
          </button>
          <button
            type="button"
            className="relative text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              12
            </span>
          </button>
          <AuthNav user={user} profile={profile} />
        </div>
      </div>
    </header>
  );
}
