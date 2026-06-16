import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListTenants, useListAgreements, useListExpenses, useListVendors, useGetDashboardSummary } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { formatINR } from "@/lib/format";

export default function MoreScreen() {
  const colors = useColors();
  const { isDark, toggleDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const { data: tenants } = useListTenants();
  const { data: agreements } = useListAgreements();
  const { data: expenses } = useListExpenses();
  const { data: vendors } = useListVendors();
  const { data: summary } = useGetDashboardSummary();

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom + 84;

  const totalExpenses = (expenses ?? []).reduce((s, e) => s + parseFloat(String(e.amount)), 0);
  const netIncome = (summary?.collectedThisMonth ?? 0) - totalExpenses;

  const sections = [
    {
      title: "Manage",
      items: [
        {
          icon: "users" as const,
          label: "Tenants",
          sub: `${tenants?.length ?? 0} tenants on record`,
          color: "#1A6BA4",
          bg: isDark ? "#0A1E38" : "#DBEAFE",
          onPress: () => router.push("/tenants"),
        },
        {
          icon: "file-text" as const,
          label: "Agreements",
          sub: `${agreements?.filter((a) => a.status === "active").length ?? 0} active leases`,
          color: isDark ? "#34D399" : "#059669",
          bg: isDark ? "#052E18" : "#D1FAE5",
          onPress: () => router.push("/agreements"),
        },
      ],
    },
    {
      title: "Finance",
      items: [
        {
          icon: "trending-down" as const,
          label: "Expenses",
          sub: `${formatINR(totalExpenses)} logged`,
          color: isDark ? "#FBBF24" : "#D97706",
          bg: isDark ? "#251A00" : "#FEF3C7",
          onPress: () => router.push("/expenses"),
        },
        {
          icon: "bar-chart-2" as const,
          label: "Reports & Analytics",
          sub: `Net: ${formatINR(netIncome)} this month`,
          color: isDark ? "#A78BFA" : "#7C3AED",
          bg: isDark ? "#1E1040" : "#EDE9FE",
          onPress: () => router.push("/reports"),
        },
      ],
    },
    {
      title: "Contacts",
      items: [
        {
          icon: "phone" as const,
          label: "Vendors",
          sub: `${vendors?.length ?? 0} service contacts`,
          color: isDark ? "#38BDF8" : "#0891B2",
          bg: isDark ? "#061E2E" : "#CFFAFE",
          onPress: () => router.push("/vendors"),
        },
      ],
    },
    {
      title: "Automation",
      items: [
        {
          icon: "bell" as const,
          label: "Rent Reminders",
          sub: "Schedule & send monthly reminders",
          color: isDark ? "#A78BFA" : "#7C3AED",
          bg: isDark ? "#1E1040" : "#EDE9FE",
          onPress: () => router.push("/reminders"),
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.navBg, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>More</Text>
            <Text style={styles.headerSub}>Tools & management</Text>
          </View>
          {/* Dark mode toggle */}
          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: "rgba(255,255,255,0.12)" }]}
            onPress={toggleDark}
            activeOpacity={0.75}
          >
            <Feather name={isDark ? "sun" : "moon"} size={18} color="#FFFFFF" />
            <Text style={styles.themeToggleText}>{isDark ? "Light" : "Dark"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 16, gap: 20 }}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {section.title.toUpperCase()}
            </Text>
            <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {section.items.map((item, i) => (
                <React.Fragment key={item.label}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <TouchableOpacity style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                    <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                      <Feather name={item.icon} size={18} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                      <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: colors.mutedForeground }]}>RentSaathi v1.0</Text>
          <Text style={[styles.appSub, { color: colors.mutedForeground }]}>Your complete landlord companion</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  themeToggle: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22,
  },
  themeToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  group: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: 1, marginLeft: 66 },
  appInfo: { alignItems: "center", paddingTop: 16, gap: 4 },
  appName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  appSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
