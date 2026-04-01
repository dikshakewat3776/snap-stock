import { AlertItem, InventoryItem } from "../../shared/types/contracts";

export function applyScanStockUpdate(
  items: InventoryItem[],
  detected: Array<{ productName: string; brand: string; quantity: number }>
): InventoryItem[] {
  return items.map((item) => {
    const match = detected.find(
      (det) => det.productName === item.name && det.brand === item.brand
    );
    if (!match) {
      return item;
    }
    return {
      ...item,
      currentStock: item.currentStock + match.quantity,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function generateLowStockAlerts(items: InventoryItem[]): AlertItem[] {
  return items
    .filter((item) => item.currentStock < item.threshold)
    .map((item) => {
      const deficitRatio = (item.threshold - item.currentStock) / Math.max(item.threshold, 1);
      const severity: AlertItem["severity"] =
        deficitRatio >= 0.7 ? "HIGH" : deficitRatio >= 0.4 ? "MEDIUM" : "LOW";
      return {
        id: `alert_${item.id}_${Date.now()}`,
        productId: item.id,
        message: `Low stock: ${item.name} (${item.currentStock} left)`,
        severity,
        currentStock: item.currentStock,
        threshold: item.threshold,
        createdAt: new Date().toISOString(),
      };
    });
}

export function generateReorderSuggestions(items: InventoryItem[]) {
  return items
    .filter((item) => item.currentStock < item.threshold)
    .map((item) => ({
      productId: item.id,
      name: item.name,
      brand: item.brand,
      currentStock: item.currentStock,
      threshold: item.threshold,
      suggestedOrderQty: Math.max(item.threshold * 2 - item.currentStock, 1),
    }))
    .sort((a, b) => a.currentStock - b.currentStock);
}
