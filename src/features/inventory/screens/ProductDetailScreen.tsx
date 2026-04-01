import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { RootStackParamList } from "../../../app/navigation/types";
import { services } from "../../../app/providers/services";
import { InventoryItem } from "../../../shared/types/contracts";

type Props = NativeStackScreenProps<RootStackParamList, "ProductDetail">;

export function ProductDetailScreen({ route, navigation }: Props) {
  const [item, setItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    services.inventoryRepository.getById(route.params.productId).then(setItem);
  }, [route.params.productId]);

  if (!item) return <View style={styles.center}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={item.name} onChangeText={(v) => setItem({ ...item, name: v })} />
      <Text style={styles.label}>Brand</Text>
      <TextInput style={styles.input} value={item.brand} onChangeText={(v) => setItem({ ...item, brand: v })} />
      <Text style={styles.label}>Current Stock</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={String(item.currentStock)}
        onChangeText={(v) => setItem({ ...item, currentStock: Number(v || 0) })}
      />
      <Text style={styles.label}>Threshold</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={String(item.threshold)}
        onChangeText={(v) => setItem({ ...item, threshold: Number(v || 0) })}
      />
      <Pressable
        style={styles.btn}
        onPress={async () => {
          await services.inventoryRepository.upsertWithCorrection(
            { ...item, updatedAt: new Date().toISOString() },
            (await services.inventoryRepository.getById(item.id))?.currentStock ?? item.currentStock
          );
          navigation.goBack();
        }}
      >
        <Text style={styles.btnText}>Save</Text>
      </Pressable>
      <Pressable
        style={[styles.btn, styles.delete]}
        onPress={async () => {
          await services.inventoryRepository.delete(item.id);
          navigation.goBack();
        }}
      >
        <Text style={styles.btnText}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f7f8fb", gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontWeight: "600" },
  input: { backgroundColor: "white", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  btn: { backgroundColor: "#0f766e", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  delete: { backgroundColor: "#b91c1c" },
  btnText: { color: "white", fontWeight: "700" },
});
