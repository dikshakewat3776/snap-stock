import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import { HomeScreen } from "../../features/home/screens/HomeScreen";
import { ScanScreen } from "../../features/scan/screens/ScanScreen";
import { DetectionReviewScreen } from "../../features/scan/screens/DetectionReviewScreen";
import { InventoryListScreen } from "../../features/inventory/screens/InventoryListScreen";
import { ProductDetailScreen } from "../../features/inventory/screens/ProductDetailScreen";
import { AlertsReorderScreen } from "../../features/alerts/screens/AlertsReorderScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      {/* Keep all screen names in sync with RootStackParamList to avoid navigation runtime errors. */}
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="DetectionReview" component={DetectionReviewScreen} options={{ title: "Review Detection" }} />
        <Stack.Screen name="InventoryList" component={InventoryListScreen} options={{ title: "Inventory" }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: "Edit Product" }} />
        <Stack.Screen name="AlertsReorder" component={AlertsReorderScreen} options={{ title: "Alerts & Reorder" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
