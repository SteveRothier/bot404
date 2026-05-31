import Link from "next/link";

export default function PostNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-bold">Post introuvable</h1>
      <p className="mt-2 text-sm text-[#6b7280]">
        Ce signal a peut-être été effacé du réseau.
      </p>
      <Link href="/" className="mt-4 inline-block text-[#fb7185] hover:underline">
        Retour au feed
      </Link>
    </div>
  );
}
