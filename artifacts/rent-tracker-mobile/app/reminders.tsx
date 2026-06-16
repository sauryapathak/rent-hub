import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  useListPayments,
  useListTenants,
  useListAllUnits,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/Badge";
import { formatINR } from "@/lib/format";
import {
  cancelAllReminders,
  getScheduledReminderCount,
  requestNotificationPermissions,
  scheduleMonthlyReminders,
  sendTestNotification,
  type ReminderTenant,
} from "@/lib/notifications";

const SETTINGS_KEY = "@rentsaathi:reminder_settings";
const DAYS = [1, 2, 3, 4, 5, 7, 10];
const HOURS: { label: string; value: number }[] = [
  { label: "8 AM", value: 8 },
  { label: "9 AM", value: 9 },
  { label: "11 AM", value: 11 },
  { label: "2 PM", value: 14 },
  { label: "6 PM", value: 18 },
];

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function RemindersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: payments, refetch: refetchPayments } = useListPayments();
  const { data: tenants } = useListTenants();
  const { data: units } = useListAllUnits();

  const [enabled, setEnabled] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [hourOfDay, setHourOfDay] = useState(9);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [scheduling, setScheduling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Tenants with unpaid/overdue payments this month
  const unpaidTenants = React.useMemo<ReminderTenant[]>(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const tenantMap = Object.fromEntries((tenants ?? []).map((t) => [t.id, t]));
    const unitMap = Object.fromEntries((units ?? []).map((u) => [u.id, u]));

    const seen = new Set<number>();
    const result: ReminderTenant[] = [];

    for (const p of payments ?? []) {
      if (p.month !== month || p.year !== year) continue;
      if (p.status === "paid") continue;
      if (seen.has(p.tenantId)) continue;
      seen.add(p.tenantId);

      const tenant = tenantMap[p.tenantId];
      if (!tenant) continue;
      result.push({
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone ?? "",
        amount: parseFloat(String(p.amount)),
      });
    }
    return result;
  }, [payments, tenants, units]);

  // Load persisted settings
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.enabled !== undefined) setEnabled(s.enabled);
          if (s.dayOfMonth) setDayOfMonth(s.dayOfMonth);
          if (s.hourOfDay !== undefined) setHourOfDay(s.hourOfDay);
        }
      } catch {}
      setSettingsLoaded(true);
    })();
  }, []);

  // Check permissions and scheduled count
  useEffect(() => {
    if (isWeb) { setPermissionGranted(false); return; }
    Notifications.getPermissionsAsync().then((r) => setPermissionGranted(r.status === "granted"));
    getScheduledReminderCount().then(setScheduledCount);
  }, []);

  async function saveSettings(patch: Partial<{ enabled: boolean; dayOfMonth: number; hourOfDay: number }>) {
    const next = { enabled, dayOfMonth, hourOfDay, ...patch };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }

  async function handleToggle(val: boolean) {
    if (val && !permissionGranted) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please allow notifications in your device settings to use rent reminders.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }
      setPermissionGranted(true);
    }
    setEnabled(val);
    await saveSettings({ enabled: val });
    if (!val) {
      await cancelAllReminders();
      setScheduledCount(0);
    }
  }

  async function handleSchedule() {
    if (!enabled) {
      Alert.alert("Enable Reminders", "Please toggle reminders on before scheduling.");
      return;
    }
    if (unpaidTenants.length === 0) {
      Alert.alert("No Unpaid Tenants", "All tenants have paid this month — nothing to schedule.");
      return;
    }
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert("Permission Required", "Notifications permission is needed.");
      return;
    }
    setScheduling(true);
    try {
      await scheduleMonthlyReminders(unpaidTenants, dayOfMonth, hourOfDay);
      await sendTestNotification();
      const count = await getScheduledReminderCount();
      setScheduledCount(count);
      await saveSettings({ dayOfMonth, hourOfDay });
      Alert.alert(
        "Reminders Scheduled ✓",
        `${count} reminders scheduled for ${unpaidTenants.length} tenant${unpaidTenants.length > 1 ? "s" : ""} on the ${ordinal(dayOfMonth)} of each month at ${HOURS.find((h) => h.value === hourOfDay)?.label ?? `${hourOfDay}:00`}. A test notification will arrive in a moment.`
      );
    } catch {
      Alert.alert("Error", "Could not schedule reminders. Please try again.");
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelAll() {
    Alert.alert("Cancel Reminders", "This will remove all scheduled rent reminder notifications.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel All",
        style: "destructive",
        onPress: async () => {
          await cancelAllReminders();
          setScheduledCount(0);
          setEnabled(false);
          await saveSettings({ enabled: false });
        },
      },
    ]);
  }

  function handleWhatsAppAll() {
    if (unpaidTenants.length === 0) {
      Alert.alert("No Unpaid Tenants", "Everyone has paid this month!");
      return;
    }
    const now = new Date();
    const monthName = now.toLocaleString("en-IN", { month: "long" });
    const year = now.getFullYear();

    // Open WhatsApp for the first unpaid tenant; user can repeat for others
    const tenant = unpaidTenants[0];
    const phone = tenant.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Dear ${tenant.name}, your rent of ${formatINR(tenant.amount)} for ${monthName} ${year} is due. Kindly arrange payment at the earliest. Thank you.`
    );
    Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetchPayments();
    setRefreshing(false);
  }

  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  if (!settingsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Status banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: enabled ? colors.successBg : colors.secondary,
            borderColor: enabled ? colors.success : colors.border,
          },
        ]}
      >
        <View style={styles.statusBannerLeft}>
          <Feather
            name={enabled ? "bell" : "bell-off"}
            size={20}
            color={enabled ? colors.success : colors.mutedForeground}
          />
          <View>
            <Text style={[styles.statusTitle, { color: enabled ? colors.success : colors.foreground }]}>
              {enabled ? "Reminders On" : "Reminders Off"}
            </Text>
            <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
              {scheduledCount > 0
                ? `${scheduledCount} notifications scheduled`
                : enabled
                ? "Tap 'Schedule' to activate"
                : "Toggle on to configure"}
            </Text>
          </View>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Web notice */}
      {isWeb && (
        <View style={[styles.noticeBox, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
          <Feather name="alert-triangle" size={15} color="#B45309" />
          <Text style={[styles.noticeText, { color: "#B45309" }]}>
            Push notifications are only available on mobile devices. Use the WhatsApp bulk-remind feature below instead.
          </Text>
        </View>
      )}

      {/* Configuration */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Schedule Settings</Text>

        <Text style={[styles.configLabel, { color: colors.mutedForeground }]}>REMIND ON DAY OF MONTH</Text>
        <View style={styles.chipRow}>
          {DAYS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.chip,
                { borderColor: colors.border },
                dayOfMonth === d && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => { setDayOfMonth(d); saveSettings({ dayOfMonth: d }); }}
            >
              <Text style={[styles.chipText, { color: dayOfMonth === d ? "#fff" : colors.foreground }]}>
                {ordinal(d)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.configLabel, { color: colors.mutedForeground }]}>REMINDER TIME</Text>
        <View style={styles.chipRow}>
          {HOURS.map((h) => (
            <TouchableOpacity
              key={h.value}
              style={[
                styles.chip,
                { borderColor: colors.border },
                hourOfDay === h.value && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => { setHourOfDay(h.value); saveSettings({ hourOfDay: h.value }); }}
            >
              <Text style={[styles.chipText, { color: hourOfDay === h.value ? "#fff" : colors.foreground }]}>
                {h.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.summaryRow, { backgroundColor: colors.secondary }]}>
          <Feather name="clock" size={14} color={colors.primary} />
          <Text style={[styles.summaryText, { color: colors.primary }]}>
            Notifications fire on the {ordinal(dayOfMonth)} at {HOURS.find((h) => h.value === hourOfDay)?.label ?? `${hourOfDay}:00`} for the next 3 months
          </Text>
        </View>
      </View>

      {/* Unpaid tenants list */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Will Be Reminded</Text>
          <View style={[styles.countBadge, { backgroundColor: unpaidTenants.length > 0 ? colors.errorBg : colors.successBg }]}>
            <Text style={[styles.countText, { color: unpaidTenants.length > 0 ? colors.error : colors.success }]}>
              {unpaidTenants.length} unpaid
            </Text>
          </View>
        </View>

        {unpaidTenants.length === 0 ? (
          <View style={styles.allPaidRow}>
            <Feather name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.allPaidText, { color: colors.success }]}>
              All tenants have paid this month!
            </Text>
          </View>
        ) : (
          unpaidTenants.map((t, i) => (
            <View
              key={t.id}
              style={[styles.tenantRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
            >
              <View style={[styles.tenantAvatar, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tenantAvatarText, { color: colors.primary }]}>
                  {t.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tenantName, { color: colors.foreground }]}>{t.name}</Text>
                <Text style={[styles.tenantPhone, { color: colors.mutedForeground }]}>{t.phone}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={[styles.tenantAmount, { color: colors.error }]}>{formatINR(t.amount)}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const now = new Date();
                    const monthName = now.toLocaleString("en-IN", { month: "long" });
                    const phone = t.phone.replace(/\D/g, "");
                    const msg = encodeURIComponent(
                      `Dear ${t.name}, your rent of ${formatINR(t.amount)} for ${monthName} ${now.getFullYear()} is due. Kindly pay at the earliest. Thank you.`
                    );
                    Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
                  }}
                >
                  <Badge label="WhatsApp" variant="success" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Action buttons */}
      <View style={{ gap: 10 }}>
        {!isWeb && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, (scheduling || !enabled) && styles.btnDisabled]}
            onPress={handleSchedule}
            disabled={scheduling || !enabled}
            activeOpacity={0.85}
          >
            {scheduling ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="bell" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  Schedule Reminders for {unpaidTenants.length} Tenant{unpaidTenants.length !== 1 ? "s" : ""}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.greenBtn, unpaidTenants.length === 0 && styles.btnDisabled]}
          onPress={handleWhatsAppAll}
          disabled={unpaidTenants.length === 0}
          activeOpacity={0.85}
        >
          <Feather name="message-circle" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>
            WhatsApp Remind All Unpaid ({unpaidTenants.length})
          </Text>
        </TouchableOpacity>

        {scheduledCount > 0 && (
          <TouchableOpacity
            style={[styles.dangerBtn, { borderColor: colors.error }]}
            onPress={handleCancelAll}
            activeOpacity={0.85}
          >
            <Feather name="bell-off" size={16} color={colors.error} />
            <Text style={[styles.dangerBtnText, { color: colors.error }]}>Cancel All Scheduled Reminders</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info box */}
      <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Reminders are scheduled as local device notifications — no internet required. They fire even if the app is closed. Reschedule each month for the latest unpaid list.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statusBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  statusBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  statusSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  noticeBox: {
    flexDirection: "row", gap: 10, padding: 12, borderRadius: 10,
    borderWidth: 1, alignItems: "flex-start",
  },
  noticeText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  countBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  configLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.7, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, padding: 10 },
  summaryText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  tenantRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  tenantAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  tenantAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tenantName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tenantPhone: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  tenantAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  allPaidRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  allPaidText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 12, padding: 16,
  },
  greenBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 12, padding: 16, backgroundColor: "#25D366",
  },
  dangerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, padding: 14, borderWidth: 1,
  },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  dangerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  btnDisabled: { opacity: 0.45 },
  infoBox: {
    flexDirection: "row", gap: 10, padding: 14, borderRadius: 10,
    borderWidth: 1, alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
