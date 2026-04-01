import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RootStackParamList } from "../../../app/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Inventory Scanner</Text>
      <Pressable style={styles.primary} onPress={() => navigation.navigate("Scan")}>
        <Text style={styles.primaryText}>Scan Shelf</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => navigation.navigate("InventoryList")}>
        <Text>Inventory</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => navigation.navigate("AlertsReorder")}>
        <Text>Alerts + Reorder</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", gap: 12, backgroundColor: "#f7f8fb" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 20 },
  primary: { backgroundColor: "#0f766e", padding: 18, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "white", fontSize: 18, fontWeight: "700" },
  secondary: { backgroundColor: "white", padding: 14, borderRadius: 12, alignItems: "center" },
});
