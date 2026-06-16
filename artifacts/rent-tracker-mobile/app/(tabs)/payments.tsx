import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListPayments, useListTenants, useListAllUnits, useListProperties } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/Badge";
import { ReceiptSheet } from "@/components/ReceiptSheet";
import type { ReceiptData } from "@/lib/receipt";
import { formatINR, formatDate, paymentStatusVariant } from "@/lib/format";

type FilterType = "all" | "paid" | "pending" | "overdue";

const MODE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  upi: "smartphone",
  cash: "dollar-sign",
  bank_transfer: "briefcase",
  cheque: "file-text",
};

let receiptSeq = 1;
function generateReceiptNumber(paymentId: number) {
  const now = new Date();
  return `RS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(paymentId).padStart(4, "0")}`;
}

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const { data: payments, isLoading, refetch } = useListPayments();
  const { data: tenants } = useListTenants();
  const { data: units } = useListAllUnits();
  const { data: properties } = useListProperties();

  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterType>("all");
  const [search, setSearch] = React.useState("");
  const [receiptData, setReceiptData] = React.useState<ReceiptData | null>(null);

  const tenantMap = React.useMemo(
    () => Object.fromEntries((tenants ?? []).map((t) => [t.id, t])),
    [tenants]
  );
  const unitMap = React.useMemo(
    () => Object.fromEntries((units ?? []).map((u) => [u.id, u])),
    [units]
  );
  const propertyMap = React.useMemo(
    () => Object.fromEntries((properties ?? []).map((p) => [p.id, p])),
    [properties]
  );

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const filtered = React.useMemo(() => {
    let list = payments ?? [];
    if (filter !== "all") {
      if (filter === "pending") list = list.filter((p) => p.status === "pending" || p.status === "partial");
      else list = list.filter((p) => p.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const t = tenantMap[p.tenantId];
        const u = unitMap[p.unitId];
        return (
          t?.name?.toLowerCase().includes(q) ||
          u?.unitNumber?.toLowerCase().includes(q) ||
          p.mode?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [payments, filter, search, tenantMap, unitMap]);

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom + 84;

  function openReceipt(payment: (typeof filtered)[0]) {
    const tenant = tenantMap[payment.tenantId];
    const unit = unitMap[payment.unitId];
    const property = unit?.propertyId ? propertyMap[unit.propertyId] : null;
    setReceiptData({
      receiptNumber: generateReceiptNumber(payment.id),
      propertyName: property?.name ?? "Property",
      unitNumber: unit?.unitNumber ?? "—",
      tenantName: tenant?.name ?? "Tenant",
      tenantPhone: tenant?.phone ?? "—",
      landlordName: "Landlord",
      amount: parseFloat(String(payment.amount)),
      month: payment.month,
      year: payment.year,
      mode: payment.mode ?? "cash",
      status: payment.status,
      paidAt: payment.paidAt,
      upiTransactionId: payment.upiTransactionId,
    });
  }

  function handleWhatsAppRemind(payment: (typeof filtered)[0]) {
    const tenant = tenantMap[payment.tenantId];
    if (!tenant?.phone) {
      Alert.alert("No phone number", "This tenant has no phone number recorded.");
      return;
    }
    const phone = tenant.phone.replace(/\D/g, "");
    const unit = unitMap[payment.unitId];
    const msg = encodeURIComponent(
      `Dear ${tenant.name}, your rent of ${formatINR(payment.amount)} for unit ${unit?.unitNumber ?? ""} (${payment.month}/${payment.year}) is ${payment.status}. Please arrange payment at the earliest. Thank you.`
    );
    Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }

  function handleUPICollect(payment: (typeof filtered)[0]) {
    const tenant = tenantMap[payment.tenantId];
    const amount = parseFloat(String(payment.amount));
    const tn = encodeURIComponent(`Rent ${payment.month}/${payment.year}`);
    const url = `upi://pay?pn=${encodeURIComponent(tenant?.name ?? "Tenant")}&am=${amount}&cu=INR&tn=${tn}`;
    Linking.canOpenURL(url).then((can) => {
      if (can) Linking.openURL(url);
      else Alert.alert("UPI not available", "No UPI app found on this device.");
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navBg, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Payments</Text>
            <Text style={styles.headerSub}>{filtered.length} records</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/payment/new")} activeOpacity={0.8}>
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={15} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search tenant, unit…"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filters}>
          {(["all", "paid", "pending", "overdue"] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, filter === f && styles.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 16, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="credit-card" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No payments found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const variant = paymentStatusVariant(item.status);
            const tenant = tenantMap[item.tenantId];
            const unit = unitMap[item.unitId];
            const isActionable = item.status === "pending" || item.status === "overdue" || item.status === "partial";
            const isPaid = item.status === "paid";
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.modeIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name={MODE_ICON[item.mode ?? "cash"] ?? "dollar-sign"} size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.amount, { color: colors.foreground }]}>{formatINR(item.amount)}</Text>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      {tenant?.name ?? "—"} · {unit?.unitNumber ?? "—"}
                    </Text>
                    <Text style={[styles.metaSub, { color: colors.mutedForeground }]}>
                      {(item.mode ?? "cash").toUpperCase().replace("_", " ")} · {item.month}/{item.year}
                    </Text>
                  </View>
                  <Badge label={item.status} variant={variant} />
                </View>

                {item.paidAt && (
                  <Text style={[styles.date, { color: colors.mutedForeground }]}>
                    Paid: {formatDate(item.paidAt)}
                  </Text>
                )}
                {!item.paidAt && item.dueDate && (
                  <Text style={[styles.date, { color: colors.error }]}>Due: {formatDate(item.dueDate)}</Text>
                )}

                {/* Action row */}
                <View style={styles.actions}>
                  {/* Receipt button — always available */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => openReceipt(item)}
                  >
                    <Feather name="file-text" size={13} color="#fff" />
                    <Text style={styles.actionBtnText}>Receipt</Text>
                  </TouchableOpacity>

                  {isActionable && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
                        onPress={() => handleWhatsAppRemind(item)}
                      >
                        <Feather name="message-circle" size={13} color="#fff" />
                        <Text style={styles.actionBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#5B4EBF" }]}
                        onPress={() => handleUPICollect(item)}
                      >
                        <Feather name="smartphone" size={13} color="#fff" />
                        <Text style={styles.actionBtnText}>UPI</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {tenant?.phone && isActionable && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.info }]}
                      onPress={() => Linking.openURL(`tel:${tenant.phone}`)}
                    >
                      <Feather name="phone" size={13} color="#fff" />
                      <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Receipt sheet modal */}
      {receiptData && (
        <ReceiptSheet
          visible={receiptData !== null}
          onClose={() => setReceiptData(null)}
          data={receiptData}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 4,
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginTop: 10, marginHorizontal: 4,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF", padding: 0 },
  filters: { flexDirection: "row", gap: 8, marginTop: 10, paddingHorizontal: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)" },
  chipActive: { backgroundColor: "#FFFFFF" },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  chipTextActive: { color: "#0D2040" },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modeIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  amount: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 1 },
  metaSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  date: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 50 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
  },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
