import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { getRequestAuth } from "@/lib/queries/auth";
import { redirect } from "next/navigation";

export default async function ProfileEditPage() {
  const { profile } = await getRequestAuth();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="w-full">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-xl font-bold">Modifier le profil</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Personnalisez votre présence sur Bot404.
        </p>
      </div>
      <ProfileEditForm profile={profile} />
    </div>
  );
}
