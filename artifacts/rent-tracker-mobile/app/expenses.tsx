import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListExpenses } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatINR, formatDate } from "@/lib/format";

const categoryColors: Record<string, { color: string; bg: string; icon: keyof typeof Feather.glyphMap }> = {
  repair: { color: "#D97706", bg: "#FEF3C7", icon: "tool" },
  maintenance: { color: "#1A6BA4", bg: "#DBEAFE", icon: "settings" },
  property_tax: { color: "#DC2626", bg: "#FEE2E2", icon: "file-text" },
  insurance: { color: "#059669", bg: "#D1FAE5", icon: "shield" },
  utilities: { color: "#7C3AED", bg: "#EDE9FE", icon: "zap" },
  painting: { color: "#0891B2", bg: "#CFFAFE", icon: "edit-2" },
  cleaning: { color: "#65A30D", bg: "#ECFCCB", icon: "wind" },
  other: { color: "#6B7280", bg: "#F3F4F6", icon: "more-horizontal" },
};

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: expenses, isLoading, refetch } = useListExpenses();
  const [refreshing, setRefreshing] = React.useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const total = (expenses ?? []).reduce((sum, e) => sum + parseFloat(String(e.amount)), 0);
  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={expenses ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={[styles.totalCard, { backgroundColor: colors.navBg }]}>
              <Text style={styles.totalLabel}>Total Expenses</Text>
              <Text style={styles.totalAmount}>{formatINR(total)}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="trending-down" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No expenses logged</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = categoryColors[item.category ?? "other"] ?? categoryColors.other;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.row}>
                  <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                    <Feather name={cat.icon} size={18} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.desc, { color: colors.foreground }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      {(item.category ?? "other").replace("_", " ").toUpperCase()} · {formatDate(item.date)}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: colors.foreground }]}>
                    {formatINR(item.amount)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  totalCard: { borderRadius: 14, padding: 18, marginBottom: 4, alignItems: "center", gap: 4 },
  totalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.65)" },
  totalAmount: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  desc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  amount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
