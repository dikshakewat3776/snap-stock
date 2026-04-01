import { InferenceAdapter } from "./InferenceAdapter";
import { DetectionResult } from "../../shared/types/contracts";

export class TFLiteInferenceAdapter implements InferenceAdapter {
  async detectProducts(_imageUri: string): Promise<DetectionResult> {
    // TODO: Load TFLite model from local assets.
    // TODO: Preprocess image (resize, normalize, RGB conversion).
    // TODO: Run model inference with TensorFlow Lite / ONNX runtime.
    // TODO: Postprocess outputs (NMS, confidence threshold, SKU mapping).
    throw new Error("TFLite inference adapter not implemented.");
  }
}
