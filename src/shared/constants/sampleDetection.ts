import { DetectionResult } from "../types/contracts";

export const sampleDetectionResult: DetectionResult = {
  scanId: "scan_2026_04_01_001",
  capturedAt: "2026-04-01T10:22:00Z",
  detections: [
    {
      productName: "Parle-G Original Gluco Biscuits 80g",
      brand: "Parle",
      quantity: 6,
      confidence: 0.91,
      bbox: { x: 0.12, y: 0.18, width: 0.24, height: 0.36 },
    },
    {
      productName: "Amul Taaza Toned Milk 500ml",
      brand: "Amul",
      quantity: 4,
      confidence: 0.87,
      bbox: { x: 0.48, y: 0.2, width: 0.22, height: 0.34 },
    },
  ],
  aggregatedItems: [
    {
      productName: "Parle-G Original Gluco Biscuits 80g",
      brand: "Parle",
      quantity: 6,
      avgConfidence: 0.91,
    },
    {
      productName: "Amul Taaza Toned Milk 500ml",
      brand: "Amul",
      quantity: 4,
      avgConfidence: 0.87,
    },
  ],
};
