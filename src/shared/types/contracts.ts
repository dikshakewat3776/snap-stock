export type ISODateString = string;

export interface DetectionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionItem {
  productName: string;
  brand: string;
  quantity: number;
  confidence: number;
  bbox: DetectionBoundingBox;
}

export interface AggregatedDetectionItem {
  productName: string;
  brand: string;
  quantity: number;
  avgConfidence: number;
}

export interface DetectionResult {
  scanId: string;
  capturedAt: ISODateString;
  detections: DetectionItem[];
  aggregatedItems: AggregatedDetectionItem[];
}

export interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  sku?: string;
  barcode?: string;
  currentStock: number;
  threshold: number;
  updatedAt: ISODateString;
}

export type SyncAction = "CREATE" | "UPDATE" | "DELETE";
export type SyncStatus = "PENDING" | "PROCESSING" | "DONE" | "CONFLICT" | "FAILED";

export interface SyncQueueItem {
  id: string;
  entity: "inventory";
  entityId: string;
  action: SyncAction;
  payload: Record<string, unknown>;
  status: SyncStatus;
  retryCount: number;
  nextRetryAt: ISODateString | null;
  conflictReason?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AlertItem {
  id: string;
  productId: string;
  message: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  currentStock: number;
  threshold: number;
  createdAt: ISODateString;
}

export interface ExportPayload {
  generatedAt: ISODateString;
  merchantName: string;
  items: Array<{
    productId: string;
    name: string;
    brand: string;
    currentStock: number;
    threshold: number;
    suggestedOrderQty: number;
  }>;
}
