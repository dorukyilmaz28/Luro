export type DashboardEvent = {
  id: string;
  eventType: string;
  timestamp: string;
  cameraId: string;
  confidence: number;
  imageUrl: string;
};

export type Camera = {
  id: string;
  name: string;
  status: "online" | "offline";
  location: string;
};

export const statSummary = {
  totalCameras: 24,
  activeAlerts: 7,
  todaysIncidents: 13,
  uptime: "99.4%",
};

export const recentEvents: DashboardEvent[] = [
  {
    id: "evt-1001",
    eventType: "Baret Eksikliği",
    timestamp: "2026-04-17T13:14:00Z",
    cameraId: "CAM-03",
    confidence: 0.96,
    imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=720&q=80",
  },
  {
    id: "evt-1002",
    eventType: "Yelek Eksikliği",
    timestamp: "2026-04-17T12:57:00Z",
    cameraId: "CAM-11",
    confidence: 0.91,
    imageUrl: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?auto=format&fit=crop&w=720&q=80",
  },
  {
    id: "evt-1003",
    eventType: "Yasaklı Bölge Girişi",
    timestamp: "2026-04-17T12:45:00Z",
    cameraId: "CAM-02",
    confidence: 0.88,
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=720&q=80",
  },
  {
    id: "evt-1004",
    eventType: "Forklift Yakınlık Riski",
    timestamp: "2026-04-17T12:34:00Z",
    cameraId: "CAM-17",
    confidence: 0.93,
    imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=720&q=80",
  },
];

export const cameraList: Camera[] = [
  { id: "CAM-01", name: "Depo Girişi", status: "online", location: "İstanbul - Kapı A" },
  { id: "CAM-02", name: "Yükleme Rampası", status: "online", location: "İstanbul - Dok 3" },
  { id: "CAM-03", name: "Üretim Hattı", status: "offline", location: "Bursa - Hat 2" },
  { id: "CAM-11", name: "Forklift Koridoru", status: "online", location: "Ankara - Bölge B" },
  { id: "CAM-17", name: "Yasaklı Alan", status: "online", location: "İzmir - Bölge D" },
];

export const eventsOverTime = [
  { day: "Pzt", events: 11 },
  { day: "Sal", events: 14 },
  { day: "Çar", events: 10 },
  { day: "Per", events: 17 },
  { day: "Cum", events: 13 },
  { day: "Cmt", events: 8 },
  { day: "Paz", events: 9 },
];

export const eventTypeDistribution = [
  { name: "Baret Eksikliği", value: 34 },
  { name: "Yelek Eksikliği", value: 21 },
  { name: "Yasaklı Bölge", value: 28 },
  { name: "Yakınlık Riski", value: 17 },
];
