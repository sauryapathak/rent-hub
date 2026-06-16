import React from "react";
import {
  ActivityIndicator,
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
import { useListTenants, useListAllUnits } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default function TenantsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const { data: tenants, isLoading, refetch } = useListTenants();
  const { data: units } = useListAllUnits();
  const [refreshing, setRefreshing] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const unitMap = React.useMemo(
    () => Object.fromEntries((units ?? []).map((u) => [u.id, u])),
    [units]
  );

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const filtered = React.useMemo(() => {
    if (!search.trim()) return tenants ?? [];
    const q = search.toLowerCase();
    return (tenants ?? []).filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q) ||
        t.employer?.toLowerCase().includes(q)
    );
  }, [tenants, search]);

  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  const kycVariant = (s: string) =>
    s === "complete" ? ("success" as const) : s === "partial" ? ("warning" as const) : ("error" as const);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, phone, employer…"
                placeholderTextColor={colors.mutedForeground}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Feather name="x" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search ? "No tenants match your search" : "No tenants yet"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const unit = item.unitId ? unitMap[item.unitId] : null;
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push(`/tenant/${item.id}`)}
                activeOpacity={0.75}
              >
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                    {unit && (
                      <Text style={[styles.unitLabel, { color: colors.primary }]}>
                        Unit {unit.unitNumber}
                      </Text>
                    )}
                    <Text style={[styles.phone, { color: colors.mutedForeground }]}>{item.phone}</Text>
                  </View>
                  <View style={styles.rightCol}>
                    <Badge label={item.kycStatus} variant={kycVariant(item.kycStatus)} />
                    {item.policeVerified && (
                      <View style={styles.verifiedBadge}>
                        <Feather name="shield" size={10} color="#059669" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions row */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      const phone = item.phone.replace(/\D/g, "");
                      const msg = encodeURIComponent(
                        `Dear ${item.name}, this is a reminder from your landlord. Please contact us for any rent-related queries.`
                      );
                      Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
                    }}
                  >
                    <Feather name="message-circle" size={12} color="#fff" />
                    <Text style={styles.actionText}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.info }]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      Linking.openURL(`tel:${item.phone}`);
                    }}
                  >
                    <Feather name="phone" size={12} color="#fff" />
                    <Text style={styles.actionText}>Call</Text>
                  </TouchableOpacity>
                  {item.employer && (
                    <Text style={[styles.employer, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.employer}
                    </Text>
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
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  unitLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  phone: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  rightCol: { alignItems: "flex-end", gap: 4 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  verifiedText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#059669" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  employer: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
