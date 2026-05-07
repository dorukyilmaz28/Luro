"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  dismissSuggestion as dismissSuggestionRow,
  recomputeSuggestions as recomputeSuggestionsRpc,
} from "@/lib/dashboard/risk";

export async function recomputeSuggestionsAction(): Promise<void> {
  const supabase = await createClient();
  await recomputeSuggestionsRpc(supabase);
  revalidatePath("/dashboard/risk");
}

export async function dismissSuggestionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const supabase = await createClient();
  await dismissSuggestionRow(supabase, id);
  revalidatePath("/dashboard/risk");
}
