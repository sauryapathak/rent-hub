import React from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { useListProperties, useGetDashboardSummary } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatINR } from "@/lib/format";

export default function PropertiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const { data: properties, isLoading, refetch } = useListProperties();
  const { data: summary } = useGetDashboardSummary();
  const [refreshing, setRefreshing] = React.useState(false);
  const [search, setSearch] = React.useState("");

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const filtered = React.useMemo(() => {
    const list = properties ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q)
    );
  }, [properties, search]);

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom + 84;

  const typeIcon: Record<string, keyof typeof Feather.glyphMap> = {
    residential: "home",
    commercial: "briefcase",
    pg: "users",
    shop: "shopping-bag",
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.navBg, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Properties</Text>
            <Text style={styles.headerSub}>{properties?.length ?? 0} properties</Text>
          </View>
          {summary && (
            <View style={styles.occupancyBadge}>
              <Text style={styles.occupancyPct}>{summary.occupancyRate}%</Text>
              <Text style={styles.occupancyLabel}>occupied</Text>
            </View>
          )}
        </View>
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, city…"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 16, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="home" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No properties found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const icon = typeIcon[item.type ?? "residential"] ?? "home";
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push(`/property/${item.id}`)}
                activeOpacity={0.75}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBg, { backgroundColor: colors.secondary }]}>
                    <Feather name={icon} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.propName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.propAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                    <Text style={[styles.propCity, { color: colors.mutedForeground }]}>
                      {item.city}, {item.state}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.cardFooter}>
                  <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
                    <Feather name="layers" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.pillText, { color: colors.mutedForeground }]}>
                      {(item.type ?? "residential").toUpperCase()}
                    </Text>
                  </View>
                  {item.pincode && (
                    <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
                      <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.pillText, { color: colors.mutedForeground }]}>{item.pincode}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 4 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  occupancyBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, padding: 8 },
  occupancyPct: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#22C55E" },
  occupancyLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginTop: 10, marginHorizontal: 4,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF", padding: 0 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  iconBg: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  propName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  propAddress: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  propCity: { fontSize: 11, fontFamily: "Inter_400Regular" },
  divider: { height: 1 },
  cardFooter: { flexDirection: "row", gap: 8, padding: 12 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
