import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { RootStackParamList } from "../../../app/navigation/types";
import { services } from "../../../app/providers/services";
import { generateLowStockAlerts } from "../../../domain/services/inventoryRules";
import { useAppStore } from "../../../store/useAppStore";
import { makeId } from "../../../shared/utils/id";

type Props = NativeStackScreenProps<RootStackParamList, "InventoryList">;

export function InventoryListScreen({ navigation }: Props) {
  const inventory = useAppStore((s) => s.inventory);
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

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.addBtn}
        onPress={async () => {
          const now = new Date().toISOString();
          await services.inventoryRepository.upsert({
            id: makeId("p_custom"),
            name: "Custom Product",
            brand: "Custom Brand",
            currentStock: 0,
            threshold: 5,
            updatedAt: now,
          });
          await refresh();
        }}
      >
        <Text style={styles.addBtnText}>Add Custom Product</Text>
      </Pressable>
      <FlatList
        data={inventory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>{item.brand}</Text>
            <Text>Stock: {item.currentStock} | Threshold: {item.threshold}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#f7f8fb" },
  addBtn: { backgroundColor: "#1d4ed8", padding: 12, borderRadius: 10, marginBottom: 8, alignItems: "center" },
  addBtnText: { color: "white", fontWeight: "700" },
  card: { backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontSize: 16, fontWeight: "700" },
});
