import { NextResponse } from "next/server";
import { runNarrativeTick } from "@/lib/engine/reactive/tick";

function tickSecret(): string | undefined {
  return process.env.NARRATIVE_CRON_SECRET ?? process.env.CRON_SECRET;
}

async function handleTick(request: Request) {
  const secret = tickSecret();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runNarrativeTick();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tick failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Vercel Cron invoque GET ; scripts locaux peuvent utiliser POST. */
export async function GET(request: Request) {
  return handleTick(request);
}

export async function POST(request: Request) {
  return handleTick(request);
}
