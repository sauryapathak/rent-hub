import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useListAllUnits, useListTenants, useCreateMaintenanceRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = ["plumbing", "electrical", "carpentry", "painting", "pest_control", "cleaning", "appliance", "other"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export default function NewMaintenanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";

  const { data: units } = useListAllUnits();
  const { data: tenants } = useListTenants();
  const createRequest = useCreateMaintenanceRequest();

  const [unitId, setUnitId] = useState<number | null>(null);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("plumbing");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bottomPad = isWeb ? 34 : insets.bottom;

  async function handleSubmit() {
    if (!unitId || !description.trim()) {
      Alert.alert("Incomplete", "Please select a unit and describe the issue");
      return;
    }
    setSubmitting(true);
    try {
      await createRequest.mutateAsync({
        unitId,
        tenantId: tenantId ?? undefined,
        category,
        priority,
        description,
        status: "raised",
      });
      await queryClient.invalidateQueries();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to raise request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>UNIT</Text>
      <View style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(units ?? []).map((u) => (
          <TouchableOpacity
            key={u.id}
            style={[styles.option, unitId === u.id && { backgroundColor: colors.primary }]}
            onPress={() => {
              setUnitId(u.id);
              const t = (tenants ?? []).find((ten) => ten.unitId === u.id);
              if (t) setTenantId(t.id);
            }}
          >
            <Text style={[styles.optText, { color: unitId === u.id ? "#fff" : colors.foreground }]}>
              {u.unitNumber}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>CATEGORY</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, category === c && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.chipText, { color: category === c ? "#fff" : colors.foreground }]}>
              {c.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>PRIORITY</Text>
      <View style={styles.chips}>
        {PRIORITIES.map((p) => {
          const pColors: Record<string, string> = {
            low: "#6B7280",
            medium: "#1A6BA4",
            high: "#D97706",
            urgent: "#DC2626",
          };
          const isActive = priority === p;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.chip,
                { borderColor: isActive ? pColors[p] : colors.border },
                isActive && { backgroundColor: pColors[p] },
              ]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.chipText, { color: isActive ? "#fff" : colors.foreground }]}>
                {p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>DESCRIPTION</Text>
      <TextInput
        style={[
          styles.input,
          styles.textArea,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
        ]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the issue in detail..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Raise Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 8 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginTop: 8 },
  selector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  option: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  optText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { height: 100, marginBottom: 4 },
  submitBtn: { borderRadius: 12, padding: 16, alignItems: "center", marginTop: 12 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
