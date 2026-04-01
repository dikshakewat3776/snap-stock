import { create } from "zustand";
import { InventoryItem, DetectionResult, AlertItem } from "../shared/types/contracts";

type AppState = {
  inventory: InventoryItem[];
  currentScan: DetectionResult | null;
  alerts: AlertItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  setCurrentScan: (scan: DetectionResult | null) => void;
  setAlerts: (alerts: AlertItem[]) => void;
};

export const useAppStore = create<AppState>((set) => ({
  inventory: [],
  currentScan: null,
  alerts: [],
  setInventory: (inventory) => set({ inventory }),
  setCurrentScan: (currentScan) => set({ currentScan }),
  setAlerts: (alerts) => set({ alerts }),
}));
