import React from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetDashboardSummary,
  useGetRentStatus,
  useGetRecentActivity,
  useListAgreements,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { StatCard } from "@/components/StatCard";
import { formatINR, formatDate, daysUntil } from "@/lib/format";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useGetDashboardSummary();
  const { data: rentStatus, refetch: refetchRent } = useGetRentStatus();
  const { data: activity, refetch: refetchActivity } = useGetRecentActivity();
  const { data: agreements } = useListAgreements();

  const [refreshing, setRefreshing] = React.useState(false);
  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchRent(), refetchActivity()]);
    setRefreshing(false);
  }

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom + 84;

  const expiringAgreements = (agreements ?? []).filter((a) => {
    if (a.status !== "active") return false;
    const d = daysUntil(a.endDate);
    return d >= 0 && d <= 45;
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 16 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>RentSaathi</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Portfolio Overview</Text>
        </View>
        <TouchableOpacity
          style={[styles.reportBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/reports")}
        >
          <Feather name="bar-chart-2" size={16} color="#fff" />
          <Text style={styles.reportBtnText}>Reports</Text>
        </TouchableOpacity>
      </View>

      {/* Expiring agreements alert */}
      {expiringAgreements.length > 0 && (
        <TouchableOpacity
          style={[styles.alertBanner, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}
          onPress={() => router.push("/agreements")}
          activeOpacity={0.85}
        >
          <Feather name="alert-triangle" size={16} color="#D97706" />
          <Text style={[styles.alertText, { color: "#92400E" }]}>
            {expiringAgreements.length} agreement{expiringAgreements.length > 1 ? "s" : ""} expiring soon
          </Text>
          <Feather name="chevron-right" size={14} color="#D97706" />
        </TouchableOpacity>
      )}

      {loadingSummary ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : summary ? (
        <>
          {/* Row 1 */}
          <View style={styles.row}>
            <StatCard
              label="Collected"
              value={formatINR(summary.collectedThisMonth)}
              sub="This month"
              accent={summary.collectedThisMonth > 0 ? "success" : "default"}
            />
            <StatCard
              label="Occupancy"
              value={`${summary.occupancyRate}%`}
              sub={`${summary.occupiedUnits}/${summary.totalUnits} units`}
            />
          </View>

          {/* Row 2 */}
          <View style={styles.row}>
            <StatCard
              label="Pending Dues"
              value={formatINR(summary.pendingDues)}
              sub="Awaiting payment"
              accent={summary.pendingDues > 0 ? "warning" : "default"}
            />
            <StatCard
              label="Overdue"
              value={String(summary.overdueCount)}
              sub="Payments past due"
              accent={summary.overdueCount > 0 ? "error" : "default"}
            />
          </View>

          {/* Monthly capacity */}
          <View style={[styles.capacityCard, { backgroundColor: colors.navBg }]}>
            <View style={styles.capacityRow}>
              <View>
                <Text style={styles.capacityLabel}>Monthly Capacity</Text>
                <Text style={styles.capacityValue}>{formatINR(summary.totalMonthlyIncome)}</Text>
              </View>
              <View style={styles.capacityRight}>
                <Text style={styles.capacityPct}>
                  {summary.totalMonthlyIncome > 0
                    ? Math.round((summary.collectedThisMonth / summary.totalMonthlyIncome) * 100)
                    : 0}%
                </Text>
                <Text style={styles.capacityPctLabel}>collected</Text>
              </View>
            </View>
            <View style={[styles.progressBg, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: "#22C55E",
                    width:
                      summary.totalMonthlyIncome > 0
                        ? `${Math.min(100, (summary.collectedThisMonth / summary.totalMonthlyIncome) * 100)}%`
                        : "0%",
                  },
                ]}
              />
            </View>
          </View>

          {/* Rent Status */}
          {rentStatus && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rent Status</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Current month collection</Text>
              <View style={styles.statusGrid}>
                <StatusRow label="Paid" count={rentStatus.paid} color={colors.success} bg={colors.successBg} />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <StatusRow label="Due" count={rentStatus.due} color={colors.warning} bg={colors.warningBg} />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <StatusRow label="Overdue" count={rentStatus.overdue} color={colors.error} bg={colors.errorBg} />
                {rentStatus.partial > 0 && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <StatusRow label="Partial" count={rentStatus.partial} color={colors.info} bg={colors.infoBg} />
                  </>
                )}
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <QuickAction icon="credit-card" label="Log Payment" color="#1A6BA4" bg="#DBEAFE" onPress={() => router.push("/payment/new")} />
              <QuickAction icon="tool" label="New Request" color="#D97706" bg="#FEF3C7" onPress={() => router.push("/maintenance/new")} />
              <QuickAction icon="users" label="Tenants" color="#059669" bg="#D1FAE5" onPress={() => router.push("/tenants")} />
              <QuickAction icon="bar-chart-2" label="Reports" color="#7C3AED" bg="#EDE9FE" onPress={() => router.push("/reports")} />
            </View>
          </View>
        </>
      ) : null}

      {/* Recent Activity */}
      {activity && activity.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
          {activity.slice(0, 7).map((item, i) => (
            <View
              key={i}
              style={[
                styles.activityItem,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.activityDot,
                  {
                    backgroundColor:
                      item.type === "payment"
                        ? colors.success
                        : item.type === "maintenance"
                        ? colors.warning
                        : colors.info,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityDesc, { color: colors.foreground }]}>{item.description}</Text>
                <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
                  {formatDate(item.timestamp)}
                </Text>
              </View>
              {item.amount ? (
                <Text style={[styles.activityAmount, { color: colors.success }]}>
                  {formatINR(item.amount)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatusRow({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.statusLabel}>{label}</Text>
      <View style={[styles.countBadge, { backgroundColor: bg }]}>
        <Text style={[styles.countText, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  bg,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.75}>
      <Feather name={icon} size={22} color={color} />
      <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 },
  greeting: { fontSize: 13, fontFamily: "Inter_500Medium" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  reportBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  row: { flexDirection: "row", gap: 12 },
  capacityCard: { borderRadius: 14, padding: 16, gap: 12 },
  capacityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  capacityLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)" },
  capacityValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 2 },
  capacityRight: { alignItems: "flex-end" },
  capacityPct: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#22C55E" },
  capacityPctLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  section: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 4 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  statusGrid: { gap: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#0F1D36" },
  countBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  divider: { height: 1, marginVertical: 2 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  quickAction: {
    width: "47%",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  quickActionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  activityItem: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, gap: 10 },
  activityDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  activityDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, flex: 1 },
  activityTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  activityAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
