import * as Linking from "expo-linking";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import { ExportPayload } from "../../shared/types/contracts";

export class ReorderExportService {
  buildText(payload: ExportPayload): string {
    const lines = payload.items.map(
      (item) =>
        `- ${item.name} (${item.brand}): stock ${item.currentStock}, reorder ${item.suggestedOrderQty}`
    );
    return [
      `Reorder List - ${payload.merchantName}`,
      `Generated: ${payload.generatedAt}`,
      "",
      ...lines,
    ].join("\n");
  }

  async shareWhatsApp(payload: ExportPayload): Promise<void> {
    const text = encodeURIComponent(this.buildText(payload));
    await Linking.openURL(`whatsapp://send?text=${text}`);
  }

  async sharePlainText(payload: ExportPayload): Promise<void> {
    const text = this.buildText(payload);
    await Share.share({ message: text });
  }

  async exportPdf(payload: ExportPayload): Promise<void> {
    const html = `<h1>Reorder List</h1><p>${payload.generatedAt}</p><pre>${this.buildText(payload)}</pre>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  }
}
