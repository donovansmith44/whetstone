"use server";

import { auth } from "@/auth";
import { getActiveTemplate } from "./templates";

/**
 * Returns the correct post-sign-in destination:
 * - `/templates/new` if the user has no active template yet (first-time onboarding)
 * - `/dashboard` otherwise
 */
export async function getOnboardingRedirect(): Promise<"/templates/new" | "/dashboard"> {
  const session = await auth();
  if (!session?.user?.id) return "/dashboard";
  const template = await getActiveTemplate();
  return template ? "/dashboard" : "/templates/new";
}
