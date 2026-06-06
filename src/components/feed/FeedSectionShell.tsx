"use client";

import { createContext, useState } from "react";
import {
  FeedBridgeProvider,
} from "@/components/feed/FeedBridgeContext";
import { PostComposerForm } from "@/components/feed/PostComposerForm";
import { FeedTabs, type FeedTab } from "@/components/feed/FeedTabs";
import { ActiveWorldEventStrip } from "@/components/lore/ActiveWorldEventStrip";
import type { Profile, WorldEvent } from "@/lib/supabase/types";

export const FeedTabContext = createContext<FeedTab>("for-you");

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  activeWorldEvent?: WorldEvent | null;
  children: React.ReactNode;
};

export function FeedSectionShell({
  user,
  profile,
  activeWorldEvent = null,
  children,
}: Props) {
  const [tab, setTab] = useState<FeedTab>("for-you");

  return (
    <FeedBridgeProvider>
      <FeedTabContext.Provider value={tab}>
        <div className="w-full">
          <FeedTabs value={tab} onChange={setTab} />
          {activeWorldEvent && <ActiveWorldEventStrip event={activeWorldEvent} />}
          <PostComposerForm user={user} profile={profile} feedTab={tab} />
          {children}
        </div>
      </FeedTabContext.Provider>
    </FeedBridgeProvider>
  );
}
