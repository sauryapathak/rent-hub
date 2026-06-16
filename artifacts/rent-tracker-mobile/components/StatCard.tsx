import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "default" | "success" | "warning" | "error";
}

export function StatCard({ label, value, sub, accent = "default" }: StatCardProps) {
  const colors = useColors();

  const valueColor =
    accent === "success"
      ? colors.success
      : accent === "warning"
      ? colors.warning
      : accent === "error"
      ? colors.error
      : colors.foreground;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {sub ? <Text style={[styles.sub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
