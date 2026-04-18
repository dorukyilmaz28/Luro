import { cameraList } from "@/lib/mock/dashboard";

export default function CamerasPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">İzleme Altyapısı</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-100">Kameralar</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-left">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.14em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Kamera</th>
              <th className="px-4 py-3">Kimlik</th>
              <th className="px-4 py-3">Konum</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody>
            {cameraList.map((camera) => (
              <tr key={camera.id} className="border-b border-white/5 text-sm text-slate-200 last:border-b-0">
                <td className="px-4 py-3">{camera.name}</td>
                <td className="px-4 py-3 text-slate-300">{camera.id}</td>
                <td className="px-4 py-3 text-slate-300">{camera.location}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ${
                      camera.status === "online"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        camera.status === "online" ? "bg-emerald-300" : "bg-rose-300"
                      }`}
                    />
                    {camera.status === "online" ? "Çevrimiçi" : "Çevrimdışı"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
