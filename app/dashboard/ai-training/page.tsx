import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listReviewQueue } from "@/lib/dashboard/overview";
import { AiTrainingReview } from "@/components/dashboard/AiTrainingReview";

export default async function AiTrainingPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const items = await listReviewQueue(user.id, 40);

  return <AiTrainingReview initialItems={items} />;
}
