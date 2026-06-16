import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setupNotificationHandler } from "@/lib/notifications";
import { ThemeProvider } from "@/contexts/ThemeContext";

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

setupNotificationHandler();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

const NAV_STYLE = {
  headerStyle: { backgroundColor: "#0D2040" },
  headerTintColor: "#F5F7FA",
  headerTitleStyle: { fontFamily: "Inter_600SemiBold", fontSize: 17 } as const,
  headerShadowVisible: false,
};

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", ...NAV_STYLE }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="property/[id]" options={{ title: "Property Details", ...NAV_STYLE }} />
      <Stack.Screen name="tenant/[id]" options={{ title: "Tenant Details", ...NAV_STYLE }} />
      <Stack.Screen name="tenants" options={{ title: "Tenants", ...NAV_STYLE }} />
      <Stack.Screen name="agreements" options={{ title: "Agreements", ...NAV_STYLE }} />
      <Stack.Screen name="expenses" options={{ title: "Expenses", ...NAV_STYLE }} />
      <Stack.Screen name="vendors" options={{ title: "Vendors", ...NAV_STYLE }} />
      <Stack.Screen name="reports" options={{ title: "Reports & Analytics", ...NAV_STYLE }} />
      <Stack.Screen
        name="payment/new"
        options={{ title: "Log Payment", presentation: "modal", ...NAV_STYLE }}
      />
      <Stack.Screen
        name="maintenance/new"
        options={{ title: "New Request", presentation: "modal", ...NAV_STYLE }}
      />
      <Stack.Screen
        name="reminders"
        options={{ title: "Rent Reminders", ...NAV_STYLE }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
