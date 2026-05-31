import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { getCurrentUserProfile } from "@/lib/queries/feed";

export default async function ProfileEditPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modifier le profil</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Personnalisez votre présence sur Bot404.
        </p>
      </div>

      <ProfileEditForm profile={profile} />

      <Link href={`/profile/${profile.username}`} className="text-sm text-[#fb7185] hover:underline">
        ← Retour au profil
      </Link>
    </div>
  );
}
