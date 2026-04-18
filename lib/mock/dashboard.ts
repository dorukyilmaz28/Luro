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
    eventType: "No Hardhat",
    timestamp: "2026-04-17T13:14:00Z",
    cameraId: "CAM-03",
    confidence: 0.96,
    imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=720&q=80",
  },
  {
    id: "evt-1002",
    eventType: "No Vest",
    timestamp: "2026-04-17T12:57:00Z",
    cameraId: "CAM-11",
    confidence: 0.91,
    imageUrl: "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?auto=format&fit=crop&w=720&q=80",
  },
  {
    id: "evt-1003",
    eventType: "Restricted Zone Entry",
    timestamp: "2026-04-17T12:45:00Z",
    cameraId: "CAM-02",
    confidence: 0.88,
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=720&q=80",
  },
  {
    id: "evt-1004",
    eventType: "Forklift Proximity",
    timestamp: "2026-04-17T12:34:00Z",
    cameraId: "CAM-17",
    confidence: 0.93,
    imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=720&q=80",
  },
];

export const cameraList: Camera[] = [
  { id: "CAM-01", name: "Warehouse Gate", status: "online", location: "Istanbul - Gate A" },
  { id: "CAM-02", name: "Loading Bay", status: "online", location: "Istanbul - Dock 3" },
  { id: "CAM-03", name: "Production Line", status: "offline", location: "Bursa - Line 2" },
  { id: "CAM-11", name: "Forklift Lane", status: "online", location: "Ankara - Zone B" },
  { id: "CAM-17", name: "Restricted Area", status: "online", location: "Izmir - Zone D" },
];

export const eventsOverTime = [
  { day: "Mon", events: 11 },
  { day: "Tue", events: 14 },
  { day: "Wed", events: 10 },
  { day: "Thu", events: 17 },
  { day: "Fri", events: 13 },
  { day: "Sat", events: 8 },
  { day: "Sun", events: 9 },
];

export const eventTypeDistribution = [
  { name: "No Hardhat", value: 34 },
  { name: "No Vest", value: 21 },
  { name: "Restricted Zone", value: 28 },
  { name: "Proximity", value: 17 },
];
