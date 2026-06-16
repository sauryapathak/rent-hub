import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  useListTenants,
  useListAllUnits,
  useListProperties,
  useCreatePayment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { ReceiptSheet } from "@/components/ReceiptSheet";
import type { ReceiptData } from "@/lib/receipt";

const MODES = ["upi", "cash", "bank_transfer", "cheque"] as const;
const STATUS_OPTIONS = ["paid", "pending", "partial"] as const;

function generateReceiptNumber(paymentId: number) {
  const now = new Date();
  return `RS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(paymentId).padStart(4, "0")}`;
}

export default function NewPaymentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";

  const { data: tenants } = useListTenants();
  const { data: units } = useListAllUnits();
  const { data: properties } = useListProperties();
  const createPayment = useCreatePayment();

  const now = new Date();
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]>("upi");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("paid");
  const [upiRef, setUpiRef] = useState("");
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [submitting, setSubmitting] = useState(false);

  // Receipt shown after successful payment creation
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const bottomPad = isWeb ? 34 : insets.bottom;

  async function handleSubmit() {
    if (!tenantId || !unitId || !amount) {
      Alert.alert("Incomplete", "Please fill tenant, unit and amount");
      return;
    }
    setSubmitting(true);
    try {
      const payment = await createPayment.mutateAsync({
        tenantId,
        unitId,
        amount: parseFloat(amount),
        month,
        year,
        status,
        mode,
        upiTransactionId: upiRef || undefined,
        paidAt: status === "paid" ? new Date().toISOString() : undefined,
        dueDate: new Date(year, month - 1, 5).toISOString(),
      });
      await queryClient.invalidateQueries();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Build receipt data from the response + local state
      const tenant = (tenants ?? []).find((t) => t.id === tenantId);
      const unit = (units ?? []).find((u) => u.id === unitId);
      const property = unit?.propertyId
        ? (properties ?? []).find((p) => p.id === unit.propertyId)
        : null;

      setReceiptData({
        receiptNumber: generateReceiptNumber(payment.id),
        propertyName: property?.name ?? "Property",
        unitNumber: unit?.unitNumber ?? "—",
        tenantName: tenant?.name ?? "Tenant",
        tenantPhone: tenant?.phone ?? "—",
        landlordName: "Landlord",
        amount: parseFloat(amount),
        month,
        year,
        mode,
        status,
        paidAt: status === "paid" ? new Date().toISOString() : null,
        upiTransactionId: upiRef || null,
        address: property?.address,
      });
    } catch {
      Alert.alert("Error", "Failed to log payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReceiptClose() {
    setReceiptData(null);
    router.back();
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.mutedForeground }]}>TENANT</Text>
        <View style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(tenants ?? []).map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.option,
                tenantId === t.id && { backgroundColor: colors.primary },
              ]}
              onPress={() => { setTenantId(t.id); setUnitId(t.unitId ?? null); }}
            >
              <Text style={[styles.optText, { color: tenantId === t.id ? "#fff" : colors.foreground }]}>
                {t.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>UNIT</Text>
        <View style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(units ?? []).filter((u) => u.status === "occupied").map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[styles.option, unitId === u.id && { backgroundColor: colors.primary }]}
              onPress={() => setUnitId(u.id)}
            >
              <Text style={[styles.optText, { color: unitId === u.id ? "#fff" : colors.foreground }]}>
                {u.unitNumber}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>AMOUNT (₹)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Enter amount"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>MODE</Text>
        <View style={styles.chips}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.chip,
                mode === m && { backgroundColor: colors.primary, borderColor: colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.chipText, { color: mode === m ? "#fff" : colors.foreground }]}>
                {m.replace("_", " ").toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>STATUS</Text>
        <View style={styles.chips}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.chip,
                status === s && { backgroundColor: colors.primary, borderColor: colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.chipText, { color: status === s ? "#fff" : colors.foreground }]}>
                {s.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === "upi" && (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>UPI TRANSACTION ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={upiRef}
              onChangeText={setUpiRef}
              placeholder="e.g. UPI2025060100123"
              placeholderTextColor={colors.mutedForeground}
            />
          </>
        )}

        <Text style={[styles.periodText, { color: colors.mutedForeground }]}>
          Period: {month}/{year}
        </Text>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Log Payment</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
          A receipt will appear automatically after logging
        </Text>
      </ScrollView>

      {receiptData && (
        <ReceiptSheet
          visible={receiptData !== null}
          onClose={handleReceiptClose}
          data={receiptData}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 8 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginTop: 8 },
  selector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  option: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  optText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  periodText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  submitBtn: { borderRadius: 12, padding: 16, alignItems: "center", marginTop: 12 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6 },
});
