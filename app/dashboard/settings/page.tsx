import { LogoutButton } from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">Account</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-100">Settings</h1>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">User Email</p>
        <p className="mt-2 text-base text-slate-100">{user?.email ?? "-"}</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Company</p>
        <p className="mt-2 text-base text-slate-100">Luro Industrial Ops</p>
      </section>

      <LogoutButton className="rounded-xl border border-[#d4a64a]/35 bg-[#d4a64a]/10 px-4 py-2.5 text-sm font-medium text-[#f4d28c] transition hover:bg-[#d4a64a]/20" />
    </div>
  );
}
