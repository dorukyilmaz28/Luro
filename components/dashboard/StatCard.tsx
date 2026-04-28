type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
};

export function StatCard({ title, value, description }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-[#e6d9ca] bg-white/75 p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{title}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:mt-2 sm:text-3xl">{value}</p>
      {description ? <p className="mt-1.5 text-xs text-slate-600 sm:mt-2 sm:text-sm">{description}</p> : null}
    </article>
  );
}
