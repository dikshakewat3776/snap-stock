import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { RootStackParamList } from "../../../app/navigation/types";
import { services } from "../../../app/providers/services";
import { useAppStore } from "../../../store/useAppStore";

type Props = NativeStackScreenProps<RootStackParamList, "Scan">;

export function ScanScreen({ navigation }: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const setCurrentScan = useAppStore((s) => s.setCurrentScan);

  const capture = async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      // Keep quality moderate for low-end devices and faster processing.
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      // Inference adapter can be mock or real TFLite; UI code stays unchanged.
      const result = await services.inferenceAdapter.detectProducts(picture.uri);
      setCurrentScan(result);
      navigation.navigate("DetectionReview");
    } finally {
      setLoading(false);
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Camera access required.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef} />
      <Pressable style={styles.btn} onPress={capture} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Capture Shelf</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  btn: { backgroundColor: "#0f766e", padding: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
