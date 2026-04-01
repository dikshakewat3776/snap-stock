import { InferenceAdapter } from "./InferenceAdapter";
import { DetectionResult } from "../../shared/types/contracts";
import { sampleDetectionResult } from "../../shared/constants/sampleDetection";

export class MockInferenceAdapter implements InferenceAdapter {
  async detectProducts(imageUri: string): Promise<DetectionResult> {
    // Deterministic fake behavior:
    // same URI length pattern => same quantity multiplier (1x or 2x).
    // This keeps debugging reproducible without a real ML model.
    const stableSeed = imageUri.length % 2;
    const multiplier = stableSeed === 0 ? 1 : 2;
    return {
      ...sampleDetectionResult,
      scanId: `scan_${Date.now()}`,
      capturedAt: new Date().toISOString(),
      detections: sampleDetectionResult.detections.map((item) => ({
        ...item,
        quantity: item.quantity * multiplier,
      })),
      aggregatedItems: sampleDetectionResult.aggregatedItems.map((item) => ({
        ...item,
        quantity: item.quantity * multiplier,
      })),
    };
  }
}
