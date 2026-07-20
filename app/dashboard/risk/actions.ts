"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import {
  dismissSuggestion as dismissSuggestionRow,
  recomputeSuggestions as recomputeSuggestionsFn,
} from "@/lib/dashboard/risk";

export async function recomputeSuggestionsAction(): Promise<void> {
  const user = await getSession();
  if (!user) return;
  await recomputeSuggestionsFn(user.id);
  revalidatePath("/dashboard/risk");
}

export async function dismissSuggestionAction(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await dismissSuggestionRow(user.id, id);
  revalidatePath("/dashboard/risk");
}
