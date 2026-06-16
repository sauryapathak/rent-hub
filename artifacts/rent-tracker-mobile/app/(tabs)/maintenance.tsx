import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListMaintenanceRequests } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/Badge";
import { formatDate, maintenancePriorityVariant, maintenanceStatusVariant } from "@/lib/format";

export default function MaintenanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const { data: requests, isLoading, refetch } = useListMaintenanceRequests();
  const [refreshing, setRefreshing] = React.useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom + 84;

  const categoryIcon: Record<string, keyof typeof Feather.glyphMap> = {
    plumbing: "droplet",
    electrical: "zap",
    carpentry: "tool",
    painting: "edit-2",
    pest_control: "shield",
    cleaning: "wind",
    appliance: "monitor",
    other: "settings",
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.navBg, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Maintenance</Text>
            <Text style={styles.headerSub}>{requests?.length ?? 0} requests</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/maintenance/new")}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 16, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="tool" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No maintenance requests</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.cardTop}>
                <View style={[styles.catIcon, { backgroundColor: colors.secondary }]}>
                  <Feather
                    name={categoryIcon[item.category ?? "other"] ?? "settings"}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.description, { color: colors.foreground }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.badges}>
                    <Badge
                      label={item.priority ?? "normal"}
                      variant={maintenancePriorityVariant(item.priority ?? "")}
                    />
                    <Badge
                      label={item.status.replace("_", " ")}
                      variant={maintenanceStatusVariant(item.status)}
                    />
                  </View>
                </View>
              </View>
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                {item.category?.replace("_", " ").toUpperCase()} · Raised {formatDate(item.createdAt)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  description: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  badges: { flexDirection: "row", gap: 6 },
  date: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
