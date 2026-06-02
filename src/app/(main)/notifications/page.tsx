import { NotificationsList } from "@/components/notifications/NotificationsList";
import { getNotifications } from "@/lib/queries/notifications";
import { redirect } from "next/navigation";
import { getRequestAuth } from "@/lib/queries/auth";

export const revalidate = 0;

export default async function NotificationsPage() {
  const { user } = await getRequestAuth();
  if (!user) redirect("/login");

  const referenceNowMs = Date.now();
  const notifications = await getNotifications();

  return (
    <div className="w-full divide-y divide-border">
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold">Notifications</h1>
        <p className="mt-1 text-meta text-muted-foreground">
          Mentions, relais et abonnements
        </p>
      </div>
      <NotificationsList
        notifications={notifications}
        referenceNowMs={referenceNowMs}
      />
    </div>
  );
}
