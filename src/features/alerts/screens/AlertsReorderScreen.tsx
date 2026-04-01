import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { services } from "../../../app/providers/services";
import { generateLowStockAlerts, generateReorderSuggestions } from "../../../domain/services/inventoryRules";
import { useAppStore } from "../../../store/useAppStore";

export function AlertsReorderScreen() {
  const inventory = useAppStore((s) => s.inventory);
  const alerts = useAppStore((s) => s.alerts);
  const setInventory = useAppStore((s) => s.setInventory);
  const setAlerts = useAppStore((s) => s.setAlerts);

  const refresh = useCallback(async () => {
    const list = await services.inventoryRepository.getAll();
    setInventory(list);
    setAlerts(generateLowStockAlerts(list));
  }, [setInventory, setAlerts]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const reorderItems = generateReorderSuggestions(inventory);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Low Stock Alerts</Text>
      <FlatList
        data={alerts.sort((a, b) => (a.severity > b.severity ? -1 : 1))}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.message}</Text>
            <Text>Priority: {item.severity}</Text>
          </View>
        )}
      />
      <Pressable
        style={styles.exportBtn}
        onPress={async () => {
          const payload = {
            generatedAt: new Date().toISOString(),
            merchantName: "Kirana Merchant",
            items: reorderItems,
          };
          await services.reorderExportService.shareWhatsApp(payload);
        }}
      >
        <Text style={styles.exportText}>Share Reorder via WhatsApp</Text>
      </Pressable>
      <Pressable
        style={[styles.exportBtn, { backgroundColor: "#1d4ed8" }]}
        onPress={async () => {
          const payload = {
            generatedAt: new Date().toISOString(),
            merchantName: "Kirana Merchant",
            items: reorderItems,
          };
          await services.reorderExportService.sharePlainText(payload);
        }}
      >
        <Text style={styles.exportText}>Share Plain Text</Text>
      </Pressable>
      <Pressable
        style={[styles.exportBtn, { backgroundColor: "#7c3aed" }]}
        onPress={async () => {
          const payload = {
            generatedAt: new Date().toISOString(),
            merchantName: "Kirana Merchant",
            items: reorderItems,
          };
          await services.reorderExportService.exportPdf(payload);
        }}
      >
        <Text style={styles.exportText}>Export PDF</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fb", padding: 12 },
  header: { fontWeight: "700", fontSize: 20, marginBottom: 8 },
  card: { backgroundColor: "white", padding: 12, borderRadius: 10, marginBottom: 8 },
  cardTitle: { fontWeight: "600" },
  exportBtn: { backgroundColor: "#0f766e", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  exportText: { color: "white", fontWeight: "700" },
});
