type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
};

export function StatCard({ title, value, description }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">{value}</p>
      {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
    </article>
  );
}
