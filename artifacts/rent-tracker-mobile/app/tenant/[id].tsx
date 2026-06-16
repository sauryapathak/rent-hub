import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  useGetTenant,
  useGetTenantPaymentHistory,
  useListAllUnits,
  useListProperties,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/Badge";
import { ReceiptSheet } from "@/components/ReceiptSheet";
import type { ReceiptData } from "@/lib/receipt";
import { generateStatementHTML } from "@/lib/statement";
import { formatINR, formatDate, paymentStatusVariant } from "@/lib/format";

function generateReceiptNumber(paymentId: number) {
  const now = new Date();
  return `RS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(paymentId).padStart(4, "0")}`;
}

export default function TenantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isWeb = Platform.OS === "web";

  const tenantId = Number(id);
  const { data: tenant, isLoading } = useGetTenant(tenantId);
  const { data: history } = useGetTenantPaymentHistory(tenantId);
  const { data: units } = useListAllUnits();
  const { data: properties } = useListProperties();

  const [receiptData, setReceiptData] = React.useState<ReceiptData | null>(null);
  const [generatingStatement, setGeneratingStatement] = React.useState(false);

  React.useEffect(() => {
    if (tenant?.name) navigation.setOptions({ title: tenant.name });
  }, [tenant?.name]);

  const unitMap = React.useMemo(
    () => Object.fromEntries((units ?? []).map((u) => [u.id, u])),
    [units]
  );
  const propertyMap = React.useMemo(
    () => Object.fromEntries((properties ?? []).map((p) => [p.id, p])),
    [properties]
  );

  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!tenant) return null;

  const kycVariant =
    tenant.kycStatus === "complete" ? "success" : tenant.kycStatus === "partial" ? "warning" : "error";

  const totalPaid = (history ?? [])
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((s, p) => s + parseFloat(String(p.amount)), 0);
  const totalDue = (history ?? [])
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + parseFloat(String(p.amount)), 0);

  const phone = tenant.phone?.replace(/\D/g, "");

  function openWhatsApp(msg: string) {
    Linking.openURL(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`);
  }

  function openReceipt(p: NonNullable<typeof history>[0]) {
    const unit = unitMap[p.unitId];
    const property = unit?.propertyId ? propertyMap[unit.propertyId] : null;
    setReceiptData({
      receiptNumber: generateReceiptNumber(p.id),
      propertyName: property?.name ?? "Property",
      unitNumber: unit?.unitNumber ?? "—",
      tenantName: tenant.name,
      tenantPhone: tenant.phone ?? "—",
      landlordName: "Landlord",
      amount: parseFloat(String(p.amount)),
      month: p.month,
      year: p.year,
      mode: p.mode ?? "cash",
      status: p.status,
      paidAt: p.paidAt,
      upiTransactionId: p.upiTransactionId,
    });
  }

  async function generateStatement() {
    if (!history || history.length === 0) {
      Alert.alert("No Data", "No payment history found for this tenant.");
      return;
    }
    setGeneratingStatement(true);
    try {
      const year = new Date().getFullYear();
      const unit = unitMap[tenant.unitId ?? 0];
      const property = unit?.propertyId ? propertyMap[unit.propertyId] : null;

      const html = generateStatementHTML({
        tenantName: tenant.name,
        tenantPhone: tenant.phone ?? "—",
        unitNumber: unit?.unitNumber ?? "—",
        propertyName: property?.name ?? "Property",
        propertyAddress: property?.address ?? undefined,
        landlordName: "Landlord",
        statementYear: year,
        payments: history.map((p) => ({
          id: p.id,
          month: p.month,
          year: p.year,
          amount: parseFloat(String(p.amount)),
          mode: p.mode ?? "cash",
          status: p.status,
          paidAt: p.paidAt,
          upiTransactionId: p.upiTransactionId,
        })),
        generatedAt: new Date().toISOString(),
      });

      const { uri } = await Print.printToFileAsync({ html, width: 794, height: 1123 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Rent Statement – ${tenant.name} – ${year}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Not available", "Sharing is not available on this device.");
      }
    } catch {
      Alert.alert("Error", "Could not generate statement. Please try again.");
    } finally {
      setGeneratingStatement(false);
    }
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 14 }}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.navBg }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{tenant.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.tenantName}>{tenant.name}</Text>
          <Text style={styles.tenantPhone}>{tenant.phone}</Text>
          <View style={styles.badgeRow}>
            <Badge label={`KYC: ${tenant.kycStatus}`} variant={kycVariant} />
            {tenant.policeVerified && <Badge label="Police Verified" variant="success" />}
          </View>

          {/* Quick contact buttons */}
          <View style={styles.contactBtns}>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: "#25D366" }]}
              onPress={() =>
                openWhatsApp(
                  `Dear ${tenant.name}, this is a message from your landlord. Please reach out if you have any queries.`
                )
              }
            >
              <Feather name="message-circle" size={15} color="#fff" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: colors.info }]}
              onPress={() => Linking.openURL(`tel:${tenant.phone}`)}
            >
              <Feather name="phone" size={15} color="#fff" />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: "#D97706" }]}
              onPress={() =>
                openWhatsApp(
                  `Dear ${tenant.name}, your rent payment is due. Kindly arrange payment at the earliest. Thank you.`
                )
              }
            >
              <Feather name="alert-circle" size={15} color="#fff" />
              <Text style={styles.contactBtnText}>Remind</Text>
            </TouchableOpacity>
          </View>

          {/* Statement button */}
          <TouchableOpacity
            style={[styles.statementBtn, { borderColor: "rgba(255,255,255,0.25)" }]}
            onPress={generateStatement}
            disabled={generatingStatement}
            activeOpacity={0.8}
          >
            {generatingStatement ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="file-text" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.statementBtnText}>Annual Statement PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Payment summary */}
        <View style={styles.payRow}>
          <View style={[styles.payTile, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.payTileLabel, { color: colors.success }]}>Total Paid</Text>
            <Text style={[styles.payTileValue, { color: colors.success }]}>{formatINR(totalPaid)}</Text>
          </View>
          <View style={[styles.payTile, { backgroundColor: colors.errorBg }]}>
            <Text style={[styles.payTileLabel, { color: colors.error }]}>Outstanding</Text>
            <Text style={[styles.payTileValue, { color: colors.error }]}>{formatINR(totalDue)}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>KYC Details</Text>
          <DetailRow label="Employer" value={tenant.employer ?? "—"} colors={colors} />
          <DetailRow
            label="Aadhaar"
            value={tenant.aadhaarNumber ? `XXXX-XXXX-${tenant.aadhaarNumber.slice(-4)}` : "—"}
            colors={colors}
          />
          <DetailRow label="PAN" value={tenant.panNumber ?? "—"} colors={colors} />
          <DetailRow label="Move-in" value={formatDate(tenant.moveInDate)} colors={colors} />
          {tenant.email && <DetailRow label="Email" value={tenant.email} colors={colors} />}
          {tenant.emergencyContact && (
            <DetailRow
              label="Emergency"
              value={`${tenant.emergencyContact} · ${tenant.emergencyPhone ?? ""}`}
              colors={colors}
            />
          )}
        </View>

        {/* Payment History */}
        {history && history.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment History</Text>
              <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
                {history.length} records
              </Text>
            </View>
            {history.map((p, i) => (
              <View
                key={p.id}
                style={[styles.payHistRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.payAmount, { color: colors.foreground }]}>
                    {formatINR(p.amount)}
                  </Text>
                  <Text style={[styles.payMeta, { color: colors.mutedForeground }]}>
                    {p.month}/{p.year} · {(p.mode ?? "cash").toUpperCase().replace("_", " ")}
                  </Text>
                  {p.paidAt && (
                    <Text style={[styles.payDate, { color: colors.mutedForeground }]}>
                      {formatDate(p.paidAt)}
                    </Text>
                  )}
                </View>
                <View style={styles.payHistActions}>
                  <Badge label={p.status} variant={paymentStatusVariant(p.status)} />
                  <TouchableOpacity
                    style={[styles.receiptBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    onPress={() => openReceipt(p)}
                  >
                    <Feather name="file-text" size={12} color={colors.primary} />
                    <Text style={[styles.receiptBtnText, { color: colors.primary }]}>Receipt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {receiptData && (
        <ReceiptSheet
          visible={receiptData !== null}
          onClose={() => setReceiptData(null)}
          data={receiptData}
        />
      )}
    </>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: { borderRadius: 16, padding: 20, alignItems: "center", gap: 8 },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  avatarText: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  tenantName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  tenantPhone: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  contactBtns: { flexDirection: "row", gap: 8, marginTop: 12 },
  contactBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, borderRadius: 10,
  },
  contactBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  statementBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 10, borderWidth: 1,
    alignSelf: "stretch", marginTop: 4,
  },
  statementBtnText: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)",
  },
  payRow: { flexDirection: "row", gap: 12 },
  payTile: { flex: 1, borderRadius: 12, padding: 14, gap: 4 },
  payTileLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  payTileValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sectionCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 9,
    borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)",
  },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 13, fontFamily: "Inter_500Medium", maxWidth: "60%", textAlign: "right" },
  payHistRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, gap: 12 },
  payAmount: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  payMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  payDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  payHistActions: { alignItems: "flex-end", gap: 6 },
  receiptBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 7, borderWidth: 1,
  },
  receiptBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
