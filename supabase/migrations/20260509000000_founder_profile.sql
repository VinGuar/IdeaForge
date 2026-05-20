-- Add structured founder profile to profiles.
-- The profile is set during onboarding and used to power the Opportunity Engine
-- in Create/Find mode. Null = onboarding not completed yet.
alter table public.profiles
  add column if not exists founder_profile jsonb;
