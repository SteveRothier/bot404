import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="px-4 py-12 text-center">
      <h1 className="text-xl font-bold">Profil introuvable</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Ce compte n&apos;existe pas ou a été supprimé.
      </p>
      <Link
        href="/search"
        className="mt-6 inline-block text-[15px] text-accent hover:underline"
      >
        Rechercher un profil
      </Link>
    </div>
  );
}
