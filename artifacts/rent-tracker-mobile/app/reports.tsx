import React from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetIncomeChart,
  useListExpenses,
  useGetDashboardSummary,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatINR } from "@/lib/format";

const EXPENSE_COLORS: Record<string, string> = {
  repair: "#D97706",
  maintenance: "#1A6BA4",
  property_tax: "#DC2626",
  insurance: "#059669",
  utilities: "#7C3AED",
  painting: "#0891B2",
  cleaning: "#65A30D",
  other: "#6B7280",
};

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: chartData, isLoading: loadingChart, refetch: refetchChart } = useGetIncomeChart();
  const { data: expenses, isLoading: loadingExpenses, refetch: refetchExpenses } = useListExpenses();
  const { data: summary, refetch: refetchSummary } = useGetDashboardSummary();

  const [refreshing, setRefreshing] = React.useState(false);
  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchChart(), refetchExpenses(), refetchSummary()]);
    setRefreshing(false);
  }

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  const isLoading = loadingChart || loadingExpenses;

  // Compute expense breakdown by category
  const expenseByCategory = React.useMemo(() => {
    if (!expenses) return [];
    const map: Record<string, number> = {};
    for (const e of expenses) {
      const cat = e.category ?? "other";
      map[cat] = (map[cat] ?? 0) + parseFloat(String(e.amount));
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({ cat, amount, pct: total > 0 ? (amount / total) * 100 : 0 }));
  }, [expenses]);

  const totalExpenses = expenseByCategory.reduce((s, e) => s + e.amount, 0);
  const totalCollected = summary?.collectedThisMonth ?? 0;
  const totalIncome = chartData ? chartData.reduce((s, m) => s + m.income, 0) : 0;
  const totalAllExpenses = chartData ? chartData.reduce((s, m) => s + m.expenses, 0) : 0;
  const netProfit = totalIncome - totalAllExpenses;

  // Chart: last 6 months for readability
  const recentMonths = chartData?.slice(-6) ?? [];
  const maxVal = Math.max(...recentMonths.map((m) => Math.max(m.income, m.expenses)), 1);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 16, paddingHorizontal: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View>
        <Text style={[styles.title, { color: colors.foreground }]}>Reports</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>12-month financial overview</Text>
      </View>

      {/* Summary tiles */}
      <View style={styles.tilesRow}>
        <View style={[styles.tile, { backgroundColor: colors.navBg }]}>
          <Text style={styles.tileLabel}>Total Income</Text>
          <Text style={[styles.tileValue, { color: "#22C55E" }]}>{formatINR(totalIncome)}</Text>
          <Text style={styles.tileSub}>12 months</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: colors.navBg }]}>
          <Text style={styles.tileLabel}>Total Expenses</Text>
          <Text style={[styles.tileValue, { color: "#EF4444" }]}>{formatINR(totalAllExpenses)}</Text>
          <Text style={styles.tileSub}>12 months</Text>
        </View>
      </View>
      <View style={[styles.netCard, { backgroundColor: netProfit >= 0 ? "#065F46" : "#7F1D1D" }]}>
        <Text style={styles.netLabel}>Net Profit (12 months)</Text>
        <Text style={styles.netValue}>{formatINR(netProfit)}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Bar chart */}
          {recentMonths.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Income vs Expenses</Text>
              <Text style={[styles.chartSub, { color: colors.mutedForeground }]}>Last 6 months</Text>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Income</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Expenses</Text>
                </View>
              </View>

              {/* Bars */}
              <View style={styles.chart}>
                {recentMonths.map((m, i) => (
                  <View key={i} style={styles.barGroup}>
                    <View style={styles.barPair}>
                      <View style={styles.barCol}>
                        <View
                          style={[
                            styles.bar,
                            {
                              backgroundColor: "#22C55E",
                              height: Math.max(4, (m.income / maxVal) * 120),
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.barCol}>
                        <View
                          style={[
                            styles.bar,
                            {
                              backgroundColor: "#EF4444",
                              height: Math.max(4, (m.expenses / maxVal) * 120),
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                      {m.month.split(" ")[0]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Monthly breakdown table */}
          {recentMonths.length > 0 && (
            <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monthly Breakdown</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHead, { color: colors.mutedForeground, flex: 2 }]}>Month</Text>
                <Text style={[styles.tableHead, { color: colors.mutedForeground }]}>Income</Text>
                <Text style={[styles.tableHead, { color: colors.mutedForeground }]}>Exp.</Text>
                <Text style={[styles.tableHead, { color: colors.mutedForeground }]}>Net</Text>
              </View>
              {recentMonths.map((m, i) => {
                const net = m.income - m.expenses;
                return (
                  <View
                    key={i}
                    style={[styles.tableRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                  >
                    <Text style={[styles.tableCell, { color: colors.foreground, flex: 2 }]}>
                      {m.month}
                    </Text>
                    <Text style={[styles.tableCell, { color: colors.success }]}>
                      {formatINR(m.income)}
                    </Text>
                    <Text style={[styles.tableCell, { color: colors.error }]}>
                      {formatINR(m.expenses)}
                    </Text>
                    <Text style={[styles.tableCell, { color: net >= 0 ? colors.success : colors.error, fontFamily: "Inter_600SemiBold" }]}>
                      {net >= 0 ? "+" : ""}{formatINR(net)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Expense breakdown */}
          {expenseByCategory.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Expenses by Category</Text>
              <Text style={[styles.chartSub, { color: colors.mutedForeground }]}>
                Total: {formatINR(totalExpenses)}
              </Text>
              <View style={styles.catList}>
                {expenseByCategory.map(({ cat, amount, pct }) => (
                  <View key={cat} style={styles.catRow}>
                    <View style={styles.catMeta}>
                      <View style={[styles.catDot, { backgroundColor: EXPENSE_COLORS[cat] ?? "#6B7280" }]} />
                      <Text style={[styles.catName, { color: colors.foreground }]}>
                        {cat.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                      <Text style={[styles.catPct, { color: colors.mutedForeground }]}>
                        {pct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={[styles.catBarBg, { backgroundColor: colors.secondary }]}>
                      <View
                        style={[
                          styles.catBarFill,
                          {
                            backgroundColor: EXPENSE_COLORS[cat] ?? "#6B7280",
                            width: `${pct}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.catAmount, { color: colors.foreground }]}>{formatINR(amount)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Occupancy card */}
          {summary && (
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Portfolio Health</Text>
              <View style={styles.healthRow}>
                <HealthTile label="Properties" value={String(summary.totalProperties)} icon="home" color="#1A6BA4" bg="#DBEAFE" />
                <HealthTile label="Total Units" value={String(summary.totalUnits)} icon="layers" color="#7C3AED" bg="#EDE9FE" />
                <HealthTile label="Occupied" value={String(summary.occupiedUnits)} icon="check-circle" color="#059669" bg="#D1FAE5" />
                <HealthTile label="Vacant" value={String(summary.vacantUnits)} icon="circle" color="#D97706" bg="#FEF3C7" />
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function HealthTile({
  label, value, icon, color, bg,
}: {
  label: string;
  value: string;
  icon: keyof typeof import("@expo/vector-icons").Feather.glyphMap;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.healthTile, { backgroundColor: bg }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.healthValue, { color }]}>{value}</Text>
      <Text style={[styles.healthLabel, { color }]}>{label}</Text>
    </View>
  );
}

import { Feather } from "@expo/vector-icons";

const styles = StyleSheet.create({
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  tilesRow: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, borderRadius: 14, padding: 14, gap: 4 },
  tileLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)" },
  tileValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tileSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)" },
  netCard: { borderRadius: 14, padding: 16, alignItems: "center", gap: 4 },
  netLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  netValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  chartCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6 },
  tableCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  chartSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  legend: { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  chart: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 140 },
  barGroup: { alignItems: "center", gap: 6 },
  barPair: { flexDirection: "row", gap: 3, alignItems: "flex-end" },
  barCol: { alignItems: "center", justifyContent: "flex-end" },
  bar: { width: 14, borderRadius: 3 },
  barLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  tableHeader: { flexDirection: "row", paddingVertical: 8 },
  tableHead: { flex: 1, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 10 },
  tableCell: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  catList: { gap: 12, marginTop: 4 },
  catRow: { gap: 6 },
  catMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  catPct: { fontSize: 12, fontFamily: "Inter_400Regular" },
  catBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: 6, borderRadius: 3 },
  catAmount: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  healthRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  healthTile: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 },
  healthValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  healthLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
});
