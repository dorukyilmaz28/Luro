// Real output from the Luro PPE pipeline (model/demo.py) against
// model/datasets/ppe/images/val/image1129.jpg using models/luro_ppe.pt.
// Used to power the interactive detection viewer with genuine model output
// instead of fabricated numbers.

export type DetectionBox = {
  className: string;
  confidence: number;
  bbox: [number, number, number, number];
};

export type DetectionEvent = {
  eventType: string;
  confidence: number;
  personBbox: [number, number, number, number];
};

export type DetectionResult = {
  imageWidth: number;
  imageHeight: number;
  detections: DetectionBox[];
  events: DetectionEvent[];
};

export const sampleDetectionResult: DetectionResult = {
  imageWidth: 1024,
  imageHeight: 683,
  detections: [
    { className: "person", confidence: 0.83, bbox: [69.77, 138.12, 469.03, 527.76] },
    { className: "person", confidence: 0.57, bbox: [457.11, 179.16, 955.79, 555.8] },
  ],
  events: [
    { eventType: "no_hardhat", confidence: 0.83, personBbox: [69.77, 138.12, 469.03, 527.76] },
    { eventType: "no_vest", confidence: 0.83, personBbox: [69.77, 138.12, 469.03, 527.76] },
    { eventType: "no_safety_gloves", confidence: 0.83, personBbox: [69.77, 138.12, 469.03, 527.76] },
    { eventType: "no_safety_boots", confidence: 0.83, personBbox: [69.77, 138.12, 469.03, 527.76] },
    { eventType: "no_safety_goggles", confidence: 0.83, personBbox: [69.77, 138.12, 469.03, 527.76] },
    { eventType: "no_hardhat", confidence: 0.57, personBbox: [457.11, 179.16, 955.79, 555.8] },
    { eventType: "no_vest", confidence: 0.57, personBbox: [457.11, 179.16, 955.79, 555.8] },
    { eventType: "no_safety_gloves", confidence: 0.57, personBbox: [457.11, 179.16, 955.79, 555.8] },
    { eventType: "no_safety_boots", confidence: 0.57, personBbox: [457.11, 179.16, 955.79, 555.8] },
    { eventType: "no_safety_goggles", confidence: 0.57, personBbox: [457.11, 179.16, 955.79, 555.8] },
  ],
};
