import { InventoryItem } from "../shared/types/contracts";

const now = new Date().toISOString();

export const seedCatalog: InventoryItem[] = [
  { id: "p_parle_g_80g", name: "Parle-G Original Gluco Biscuits 80g", brand: "Parle", currentStock: 12, threshold: 10, updatedAt: now },
  { id: "p_amul_taaza_500", name: "Amul Taaza Toned Milk 500ml", brand: "Amul", currentStock: 8, threshold: 12, updatedAt: now },
  { id: "p_britannia_goodday", name: "Britannia Good Day Cashew 75g", brand: "Britannia", currentStock: 6, threshold: 8, updatedAt: now },
  { id: "p_hul_lux_soap", name: "Lux Soap 100g", brand: "HUL", currentStock: 20, threshold: 10, updatedAt: now },
];
