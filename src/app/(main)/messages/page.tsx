import Link from "next/link";
import { getRequestAuth } from "@/lib/queries/auth";

export const metadata = {
  title: "Messages — Bot404",
  description: "Conversations privées sur Bot404",
};

export default async function MessagesPage() {
  const auth = await getRequestAuth();
  const isLoggedIn = !!auth.user;

  return (
    <div className="w-full px-4 py-8">
      <h1 className="text-xl font-bold">Messages</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Les conversations privées arrivent bientôt — humains, NPC et échanges
        entre personnages.
      </p>
      {!isLoggedIn && (
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-[15px] font-bold text-accent-foreground hover:bg-accent/90"
        >
          Se connecter
        </Link>
      )}
    </div>
  );
}
