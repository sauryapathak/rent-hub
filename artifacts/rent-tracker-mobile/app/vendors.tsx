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
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListVendors } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const categoryIcon: Record<string, keyof typeof Feather.glyphMap> = {
  plumber: "droplet",
  electrician: "zap",
  carpenter: "tool",
  painter: "edit-2",
  pest_control: "shield",
  cleaner: "wind",
  other: "settings",
};

const categoryColor: Record<string, { color: string; bg: string }> = {
  plumber: { color: "#1A6BA4", bg: "#DBEAFE" },
  electrician: { color: "#D97706", bg: "#FEF3C7" },
  carpenter: { color: "#92400E", bg: "#FDE68A" },
  painter: { color: "#7C3AED", bg: "#EDE9FE" },
  pest_control: { color: "#DC2626", bg: "#FEE2E2" },
  cleaner: { color: "#059669", bg: "#D1FAE5" },
  other: { color: "#6B7280", bg: "#F3F4F6" },
};

export default function VendorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: vendors, isLoading, refetch } = useListVendors();
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
          data={vendors ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="phone" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No vendors added</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = categoryColor[item.category ?? "other"] ?? categoryColor.other;
            const icon = categoryIcon[item.category ?? "other"] ?? "settings";
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.row}>
                  <View style={[styles.iconBox, { backgroundColor: cat.bg }]}>
                    <Feather name={icon} size={20} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                      {item.available && (
                        <View style={[styles.dot, { backgroundColor: colors.success }]} />
                      )}
                    </View>
                    <Text style={[styles.category, { color: cat.color }]}>
                      {(item.category ?? "other").replace("_", " ").toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  >
                    <Feather name="phone" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                {item.rateCard && (
                  <Text style={[styles.rates, { color: colors.mutedForeground }]}>{item.rateCard}</Text>
                )}
                {item.rating && (
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={12} color="#F59E0B" />
                    <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                      {item.rating}/5
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  category: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4, marginTop: 2 },
  callBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rates: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 56 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 56 },
  ratingText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
