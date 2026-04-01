import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { RootStackParamList } from "../../../app/navigation/types";
import { services } from "../../../app/providers/services";
import { DetectionOverlay } from "../components/DetectionOverlay";
import { useAppStore } from "../../../store/useAppStore";
import { AggregatedDetectionItem } from "../../../shared/types/contracts";

type Props = NativeStackScreenProps<RootStackParamList, "DetectionReview">;

export function DetectionReviewScreen({ navigation }: Props) {
  const scan = useAppStore((s) => s.currentScan);
  const [items, setItems] = useState<AggregatedDetectionItem[]>([]);

  useEffect(() => {
    setItems(scan?.aggregatedItems ?? []);
  }, [scan]);

  if (!scan) {
    return <View style={styles.center}><Text>No scan data.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <DetectionOverlay detections={scan.detections} />
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.productName}_${item.brand}`}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.productName}</Text>
            <TextInput
              keyboardType="numeric"
              value={String(item.quantity)}
              onChangeText={(text) => {
                const quantity = Number(text || 0);
                setItems((prev) =>
                  prev.map((x, i) => (i === index ? { ...x, quantity: Number.isNaN(quantity) ? 0 : quantity } : x))
                );
              }}
              style={styles.input}
            />
          </View>
        )}
      />
      <Pressable
        style={styles.btn}
        onPress={async () => {
          await services.confirmDetectionsUseCase.execute({ ...scan, aggregatedItems: items });
          navigation.navigate("InventoryList");
        }}
      >
        <Text style={styles.btnText}>Confirm & Save</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#f7f8fb", gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 8 },
  name: { fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, width: 100 },
  btn: { backgroundColor: "#0f766e", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700" },
});
