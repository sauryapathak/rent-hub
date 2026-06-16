import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProperty, useListUnits, useListTenants } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/Badge";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isWeb = Platform.OS === "web";

  const propId = Number(id);
  const { data: property, isLoading: loadingProp } = useGetProperty(propId);
  const { data: units, isLoading: loadingUnits, refetch } = useListUnits(propId);
  const { data: tenants } = useListTenants();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (property?.name) navigation.setOptions({ title: property.name });
  }, [property?.name]);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const tenantByUnit = React.useMemo(
    () => Object.fromEntries((tenants ?? []).filter((t) => t.unitId).map((t) => [t.unitId!, t])),
    [tenants]
  );

  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  if (loadingProp) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const statusVariant = (s: string) =>
    s === "occupied" ? ("success" as const) : s === "vacant" ? ("default" as const) : ("warning" as const);

  const occupiedUnits = (units ?? []).filter((u) => u.status === "occupied");
  const vacantUnits = (units ?? []).filter((u) => u.status === "vacant");
  const monthlyCapacity = (units ?? []).reduce((sum, u) => sum + parseFloat(String(u.rentAmount ?? 0)), 0);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={units ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 10 }}
      refreshControl={
        <RefreshControl refreshing={refreshing || loadingUnits} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        property ? (
          <View style={{ gap: 12, marginBottom: 4 }}>
            {/* Property hero */}
            <View style={[styles.propCard, { backgroundColor: colors.navBg }]}>
              <Text style={styles.propName}>{property.name}</Text>
              <Text style={styles.propAddress}>{property.address}</Text>
              <Text style={styles.propCity}>
                {property.city}, {property.state} – {property.pincode}
              </Text>
              <View style={[styles.divider, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
              <View style={styles.propMeta}>
                <MetaStat label="Type" value={(property.type ?? "residential").toUpperCase()} />
                <MetaStat label="Units" value={String(units?.length ?? 0)} />
                <MetaStat label="Occupied" value={String(occupiedUnits.length)} />
                <MetaStat label="Monthly" value={formatINR(monthlyCapacity)} />
              </View>
            </View>

            {/* Occupancy bar */}
            <View style={[styles.occCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.occRow}>
                <Text style={[styles.occLabel, { color: colors.foreground }]}>Occupancy</Text>
                <Text style={[styles.occPct, { color: units && units.length > 0 ? colors.success : colors.mutedForeground }]}>
                  {units && units.length > 0 ? Math.round((occupiedUnits.length / units.length) * 100) : 0}%
                </Text>
              </View>
              <View style={[styles.occBarBg, { backgroundColor: colors.secondary }]}>
                <View
                  style={[
                    styles.occBarFill,
                    {
                      backgroundColor: colors.success,
                      width: units && units.length > 0 ? `${(occupiedUnits.length / units.length) * 100}%` : "0%",
                    },
                  ]}
                />
              </View>
              <View style={styles.occStats}>
                <Text style={[styles.occStat, { color: colors.success }]}>{occupiedUnits.length} occupied</Text>
                <Text style={[styles.occStat, { color: colors.mutedForeground }]}>{vacantUnits.length} vacant</Text>
              </View>
            </View>

            <Text style={[styles.unitsHeader, { color: colors.mutedForeground }]}>UNITS</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather name="layers" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No units added</Text>
        </View>
      }
      renderItem={({ item }) => {
        const tenant = tenantByUnit[item.id];
        return (
          <View style={[styles.unitCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.unitRow}>
              <View style={[styles.unitNum, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.unitNumText, { color: colors.primary }]}>{item.unitNumber}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.unitType, { color: colors.foreground }]}>
                  {(item.type ?? "flat").charAt(0).toUpperCase() + (item.type ?? "flat").slice(1)}
                  {item.floor ? ` · Floor ${item.floor}` : ""}
                </Text>
                <Text style={[styles.unitRent, { color: colors.primary }]}>
                  {formatINR(item.rentAmount)}/mo
                </Text>
              </View>
              <Badge label={item.status} variant={statusVariant(item.status)} />
            </View>

            {/* Tenant info + actions */}
            {tenant ? (
              <View style={[styles.tenantRow, { backgroundColor: colors.secondary, borderRadius: 10 }]}>
                <View style={[styles.tenantAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tenantAvatarText}>{tenant.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tenantName, { color: colors.foreground }]}>{tenant.name}</Text>
                  <Text style={[styles.tenantPhone, { color: colors.mutedForeground }]}>{tenant.phone}</Text>
                </View>
                <View style={styles.tenantActions}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: "#25D366" }]}
                    onPress={() => {
                      const phone = tenant.phone.replace(/\D/g, "");
                      const msg = encodeURIComponent(
                        `Dear ${tenant.name}, please pay your rent of ${formatINR(item.rentAmount)} for unit ${item.unitNumber}. Thank you.`
                      );
                      Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
                    }}
                  >
                    <Feather name="message-circle" size={14} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: colors.info }]}
                    onPress={() => Linking.openURL(`tel:${tenant.phone}`)}
                  >
                    <Feather name="phone" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : item.status === "vacant" ? (
              <View style={[styles.vacantRow, { backgroundColor: colors.secondary }]}>
                <Feather name="user-plus" size={14} color={colors.mutedForeground} />
                <Text style={[styles.vacantText, { color: colors.mutedForeground }]}>Vacant · Available for rent</Text>
              </View>
            ) : null}

            {item.amenities && (
              <Text style={[styles.amenities, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.amenities}
              </Text>
            )}
          </View>
        );
      }}
    />
  );
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaStat}>
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  propCard: { borderRadius: 14, padding: 18, gap: 4 },
  propName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  propAddress: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 4 },
  propCity: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)" },
  divider: { height: 1, marginVertical: 12 },
  propMeta: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  metaStat: { alignItems: "center", gap: 2 },
  metaValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  metaLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  occCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  occRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  occLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  occPct: { fontSize: 18, fontFamily: "Inter_700Bold" },
  occBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  occBarFill: { height: 6, borderRadius: 3 },
  occStats: { flexDirection: "row", gap: 16 },
  occStat: { fontSize: 12, fontFamily: "Inter_400Regular" },
  unitsHeader: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginLeft: 4 },
  unitCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  unitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  unitNum: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  unitNumText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  unitType: { fontSize: 14, fontFamily: "Inter_500Medium" },
  unitRent: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  tenantRow: { flexDirection: "row", alignItems: "center", padding: 10, gap: 10 },
  tenantAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tenantAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  tenantName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tenantPhone: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tenantActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  vacantRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  vacantText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  amenities: { fontSize: 12, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
