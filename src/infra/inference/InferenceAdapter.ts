import { DetectionResult } from "../../shared/types/contracts";

export interface InferenceAdapter {
  detectProducts(imageUri: string): Promise<DetectionResult>;
}
