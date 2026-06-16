import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface ReminderSettings {
  enabled: boolean;
  dayOfMonth: number; // 1-28
  hourOfDay: number;  // 0-23
}

export const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  dayOfMonth: 1,
  hourOfDay: 9,
};

const REMINDER_ID_PREFIX = "rent-reminder-";

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Schedule next-month reminders for unpaid tenants ─────────────────────────

export interface ReminderTenant {
  id: number;
  name: string;
  phone: string;
  amount: number;
}

export async function scheduleMonthlyReminders(
  tenants: ReminderTenant[],
  dayOfMonth: number,
  hourOfDay: number
): Promise<string[]> {
  // Cancel existing rent reminders first
  await cancelAllReminders();

  const now = new Date();
  const scheduledIds: string[] = [];

  // Schedule for up to 3 upcoming months
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, dayOfMonth, hourOfDay, 0, 0);
    // Skip if date is in the past
    if (targetDate <= now) continue;

    for (const tenant of tenants) {
      const monthName = targetDate.toLocaleString("en-IN", { month: "long" });
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_ID_PREFIX}${tenant.id}-${targetDate.getFullYear()}-${targetDate.getMonth()}`,
        content: {
          title: "🏠 Rent Reminder",
          body: `${tenant.name}'s rent of ₹${tenant.amount.toLocaleString("en-IN")} is due for ${monthName} ${targetDate.getFullYear()}`,
          data: { tenantId: tenant.id, type: "rent-reminder" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
        },
      });
      scheduledIds.push(id);
    }
  }

  return scheduledIds;
}

// ─── Cancel all scheduled reminders ──────────────────────────────────────────

export async function cancelAllReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminderIds = scheduled
    .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX))
    .map((n) => n.identifier);
  await Promise.all(reminderIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

// ─── Count currently scheduled reminders ─────────────────────────────────────

export async function getScheduledReminderCount(): Promise<number> {
  if (Platform.OS === "web") return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX)).length;
}

// ─── Send an immediate test notification ────────────────────────────────────

export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🏠 RentSaathi Reminders Active",
      body: "You'll receive rent reminders on the configured day each month.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
}

// ─── Configure notification handler (call once at app startup) ───────────────

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
