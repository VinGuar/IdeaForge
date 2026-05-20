import type { SupabaseClient } from "@supabase/supabase-js";

export type FounderProfile = {
  role: string;
  technicalLevel: string[];
  interests: string[];
  goal: string;
  monetizationPref: string;
  completedAt: string;
};

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return (val as unknown[]).filter((s): s is string => typeof s === "string");
  if (typeof val === "string" && val) return [val];
  return [];
}

function toFirstString(val: unknown): string {
  if (Array.isArray(val)) return typeof val[0] === "string" ? val[0] : "";
  if (typeof val === "string") return val;
  return "";
}

function normalizeProfile(raw: unknown): FounderProfile {
  const p = raw as Record<string, unknown>;
  return {
    role: toFirstString(p.role),
    technicalLevel: toStringArray(p.technicalLevel),
    interests: Array.isArray(p.interests) ? (p.interests as string[]) : [],
    goal: toFirstString(p.goal),
    monetizationPref: toFirstString(p.monetizationPref),
    completedAt: typeof p.completedAt === "string" ? p.completedAt : new Date().toISOString(),
  };
}

export async function loadFounderProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<FounderProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("founder_profile")
    .eq("id", userId)
    .single();

  if (error || !data?.founder_profile) return null;
  return normalizeProfile(data.founder_profile);
}

export async function saveFounderProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: FounderProfile,
): Promise<void> {
  await supabase
    .from("profiles")
    .upsert({ id: userId, founder_profile: profile, updated_at: new Date().toISOString() });
}

export function founderProfileToText(profile: FounderProfile): string {
  const parts: string[] = [];
  if (profile.role) parts.push(`Role: ${profile.role}`);
  if (profile.technicalLevel?.length) parts.push(`Technical level: ${profile.technicalLevel.join(", ")}`);
  if (profile.interests?.length) parts.push(`Markets / interests: ${profile.interests.join(", ")}`);
  if (profile.goal) parts.push(`Goal: ${profile.goal}`);
  if (profile.monetizationPref) parts.push(`Monetization preference: ${profile.monetizationPref}`);
  return parts.join("\n");
}
