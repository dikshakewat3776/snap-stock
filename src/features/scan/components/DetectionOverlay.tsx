import { StyleSheet, Text, View } from "react-native";
import { DetectionItem } from "../../../shared/types/contracts";

export function DetectionOverlay({ detections }: { detections: DetectionItem[] }) {
  return (
    <View style={styles.container}>
      {detections.map((det, index) => (
        <View
          key={`${det.productName}_${index}`}
          style={[
            styles.box,
            {
              left: `${det.bbox.x * 100}%`,
              top: `${det.bbox.y * 100}%`,
              width: `${det.bbox.width * 100}%`,
              height: `${det.bbox.height * 100}%`,
            },
          ]}
        >
          <Text style={styles.label}>{det.productName}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", width: "100%", height: 220, backgroundColor: "#dbeafe" },
  box: { position: "absolute", borderWidth: 2, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.15)" },
  label: { color: "#111827", fontSize: 10, fontWeight: "700", backgroundColor: "rgba(255,255,255,0.8)" },
});
