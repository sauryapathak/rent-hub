import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = "default" }: BadgeProps) {
  const colors = useColors();

  const bg =
    variant === "success"
      ? colors.successBg
      : variant === "warning"
      ? colors.warningBg
      : variant === "error"
      ? colors.errorBg
      : variant === "info"
      ? colors.infoBg
      : colors.muted;

  const fg =
    variant === "success"
      ? colors.success
      : variant === "warning"
      ? colors.warning
      : variant === "error"
      ? colors.error
      : variant === "info"
      ? colors.info
      : colors.mutedForeground;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
