import { AppShell } from "@/components/layout/AppShell";
import { getShellData } from "@/lib/queries/shell-data";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = await getShellData();

  return (
    <AppShell
      stats={shell.stats}
      hashtags={shell.hashtags}
      event={shell.event}
    >
      {children}
    </AppShell>
  );
}
