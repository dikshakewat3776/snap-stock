import {
  applyScanStockUpdate,
  generateLowStockAlerts,
  generateReorderSuggestions,
} from "../domain/services/inventoryRules";

describe("inventory rules", () => {
  it("updates stock after scan confirmation", () => {
    const updated = applyScanStockUpdate(
      [
        {
          id: "1",
          name: "Parle-G Original Gluco Biscuits 80g",
          brand: "Parle",
          currentStock: 5,
          threshold: 10,
          updatedAt: new Date().toISOString(),
        },
      ],
      [{ productName: "Parle-G Original Gluco Biscuits 80g", brand: "Parle", quantity: 6 }]
    );
    expect(updated[0].currentStock).toBe(11);
  });

  it("triggers low stock alert when stock falls below threshold", () => {
    const alerts = generateLowStockAlerts([
      {
        id: "1",
        name: "Parle-G",
        brand: "Parle",
        currentStock: 5,
        threshold: 10,
        updatedAt: new Date().toISOString(),
      },
    ]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].message).toContain("Low stock: Parle-G (5 left)");
  });

  it("creates reorder list with suggested quantities", () => {
    const reorder = generateReorderSuggestions([
      {
        id: "1",
        name: "Parle-G",
        brand: "Parle",
        currentStock: 2,
        threshold: 10,
        updatedAt: new Date().toISOString(),
      },
    ]);
    expect(reorder[0].suggestedOrderQty).toBe(18);
  });
});
