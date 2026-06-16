import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useColors } from "@/hooks/useColors";
import { generateReceiptHTML } from "@/lib/receipt";
import type { ReceiptData } from "@/lib/receipt";
import { formatINR, formatDate } from "@/lib/format";

interface ReceiptSheetProps {
  visible: boolean;
  onClose: () => void;
  data: ReceiptData;
}

export function ReceiptSheet({ visible, onClose, data }: ReceiptSheetProps) {
  const colors = useColors();
  const [generating, setGenerating] = useState(false);

  async function generateAndShare(shareVia?: "whatsapp") {
    setGenerating(true);
    try {
      const html = generateReceiptHTML(data);
      const { uri } = await Print.printToFileAsync({
        html,
        width: 612,
        height: 792,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      if (shareVia === "whatsapp") {
        const phone = data.tenantPhone.replace(/\D/g, "");
        const msg = encodeURIComponent(
          `Dear ${data.tenantName}, please find your rent receipt for ${monthName(data.month)} ${data.year}. Amount: ${formatINR(data.amount)}. Receipt No: ${data.receiptNumber}. Thank you.`
        );
        // Share PDF first, then open WhatsApp with message
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Rent Receipt – ${data.tenantName}`,
            UTI: "com.adobe.pdf",
          });
        } else {
          Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
        }
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Rent Receipt – ${data.tenantName}`,
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert("Sharing not available", "Cannot share files on this device.");
        }
      }
    } catch (err) {
      Alert.alert("Error", "Could not generate receipt. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function printReceipt() {
    setGenerating(true);
    try {
      const html = generateReceiptHTML(data);
      await Print.printAsync({ html, width: 612, height: 792 });
    } catch {
      Alert.alert("Error", "Could not open print dialog.");
    } finally {
      setGenerating(false);
    }
  }

  const statusColor =
    data.status === "paid" ? colors.success : data.status === "partial" ? colors.warning : colors.error;
  const statusBg =
    data.status === "paid" ? colors.successBg : data.status === "partial" ? colors.warningBg : colors.errorBg;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Modal header */}
        <View style={[styles.modalHeader, { backgroundColor: colors.navBg }]}>
          <View>
            <Text style={styles.modalTitle}>Rent Receipt</Text>
            <Text style={styles.modalSub}>{data.receiptNumber}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {/* Preview card */}
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Header strip */}
            <View style={[styles.previewHeader, { backgroundColor: colors.navBg }]}>
              <Text style={styles.previewBrand}>🏠 RentSaathi</Text>
              <Text style={styles.previewReceiptNo}>{data.receiptNumber}</Text>
            </View>

            {/* Status */}
            <View style={[styles.statusRow, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {data.status === "paid" ? "PAYMENT RECEIVED" : data.status === "partial" ? "PARTIAL PAYMENT" : "PAYMENT PENDING"}
              </Text>
            </View>

            {/* Amount */}
            <View style={styles.amountSection}>
              <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Rent Amount</Text>
              <Text style={[styles.amountValue, { color: colors.foreground }]}>{formatINR(data.amount)}</Text>
              <View style={[styles.periodBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.periodText, { color: colors.primary }]}>
                  {monthName(data.month)} {data.year}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Details */}
            <View style={styles.detailsGrid}>
              <DetailItem label="Tenant" value={data.tenantName} colors={colors} />
              <DetailItem label="Unit" value={data.unitNumber} colors={colors} />
              <DetailItem label="Property" value={data.propertyName} colors={colors} />
              <DetailItem label="Mode" value={data.mode.toUpperCase().replace("_", " ")} colors={colors} />
              {data.paidAt && <DetailItem label="Paid On" value={formatDate(data.paidAt)} colors={colors} />}
              {data.upiTransactionId && (
                <DetailItem label="UPI Ref" value={data.upiTransactionId} colors={colors} />
              )}
            </View>

            {/* Watermark */}
            {data.status === "paid" && (
              <View style={styles.watermarkContainer} pointerEvents="none">
                <Text style={styles.watermark}>PAID</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionsSection}>
            <Text style={[styles.actionsLabel, { color: colors.mutedForeground }]}>SHARE RECEIPT</Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#25D366" }]}
              onPress={() => generateAndShare("whatsapp")}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="message-circle" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Share via WhatsApp</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => generateAndShare()}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <Feather name="share-2" size={16} color={colors.primary} />
                  <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Share PDF</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS !== "web" && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={printReceipt}
                disabled={generating}
                activeOpacity={0.85}
              >
                <Feather name="printer" size={16} color={colors.foreground} />
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Print</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info note */}
          <View style={[styles.noteBox, { backgroundColor: colors.secondary }]}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              A PDF receipt will be generated and you can share it directly via any app or print it.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function DetailItem({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function monthName(m: number) {
  return [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][m - 1] ?? String(m);
}

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  previewCard: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
    position: "relative",
  },
  previewHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14,
  },
  previewBrand: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  previewReceiptNo: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  amountSection: { padding: 20, alignItems: "center", gap: 6 },
  amountLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.8 },
  amountValue: { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  periodBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  periodText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginHorizontal: 14 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 14, gap: 12 },
  detailItem: { width: "47%" },
  detailLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.6 },
  detailValue: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  watermarkContainer: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
  },
  watermark: {
    fontSize: 60, fontFamily: "Inter_700Bold", color: "rgba(22,163,74,0.08)",
    transform: [{ rotate: "-25deg" }], letterSpacing: 6,
  },
  actionsSection: { gap: 10 },
  actionsLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 2 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 12, padding: 16,
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, padding: 14, borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  noteBox: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 10, alignItems: "flex-start" },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
