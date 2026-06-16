import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedScheme: "light" | "dark";
  setPreference: (p: ThemePreference) => void;
  toggleDark: () => void;
  isDark: boolean;
}

const STORAGE_KEY = "@rentsaathi:theme";

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  resolvedScheme: "light",
  setPreference: () => {},
  toggleDark: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") {
        setPreferenceState(v);
      }
      setLoaded(true);
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const toggleDark = useCallback(() => {
    setPreference((prev: ThemePreference) => {
      const current = prev === "system" ? systemScheme : prev;
      return current === "dark" ? "light" : "dark";
    });
  }, [systemScheme, setPreference]);

  const resolvedScheme: "light" | "dark" =
    preference === "system" ? systemScheme : preference;
  const isDark = resolvedScheme === "dark";

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ preference, resolvedScheme, setPreference, toggleDark, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
