import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  // Server-side signOut clears the session cookie via the SSR cookie handler.
  // Client-side signOut only touches localStorage and misses the cookie.
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
