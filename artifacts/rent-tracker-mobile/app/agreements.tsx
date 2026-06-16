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
import { useListAgreements } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/Badge";
import { formatINR, formatDate, daysUntil } from "@/lib/format";

export default function AgreementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: agreements, isLoading, refetch } = useListAgreements();
  const [refreshing, setRefreshing] = React.useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={agreements ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="file-text" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No agreements</Text>
            </View>
          }
          renderItem={({ item }) => {
            const days = daysUntil(item.endDate);
            const statusVariant =
              item.status === "active" ? (days < 30 ? "warning" : "success") :
              item.status === "expired" ? "error" : "default";

            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.row}>
                  <View style={[styles.typeIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name="file-text" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.type, { color: colors.foreground }]}>
                      {(item.type ?? "residential").charAt(0).toUpperCase() + (item.type ?? "residential").slice(1)} Agreement
                    </Text>
                    <Text style={[styles.rent, { color: colors.primary }]}>
                      {formatINR(item.rentAmount)}/month
                    </Text>
                  </View>
                  <Badge label={item.status} variant={statusVariant} />
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.dates}>
                  <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                    {formatDate(item.startDate)} → {formatDate(item.endDate)}
                  </Text>
                  {item.status === "active" && days > 0 && (
                    <Text style={[styles.days, { color: days < 30 ? colors.warning : colors.mutedForeground }]}>
                      {days}d left
                    </Text>
                  )}
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
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  type: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rent: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  divider: { height: 1 },
  dates: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  days: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
