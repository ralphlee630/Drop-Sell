import React, { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * Gates the entire app behind authentication. Any route outside the
 * (auth) group is inaccessible without a signed-in session — the app
 * opens directly to login/register, not a browsable public home.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const colors = useColors();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Listen for notifications received while app is open (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // In-app notification bell badge is updated via AppContext notifications state;
      // no extra action needed here.
    });

    // Handle taps on notifications (foreground, background, killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data) return;

      if (data.screen === 'item' && data.itemId) {
        router.push(`/item/${data.itemId}`);
      } else if (data.screen === 'partnerships') {
        router.push('/sell/partnerships');
      } else {
        router.push('/(tabs)/notifications');
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <AuthGate>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="area/[id]"
          options={{ title: 'Dropping Area', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="item/[id]"
          options={{ title: 'Item Details', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="sell/new-item"
          options={{ title: 'List New Item', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="sell/partnerships"
          options={{ title: 'Partnerships', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="areas/register"
          options={{ title: 'Register a Dropping Area', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="hub-admin/[id]"
          options={{ title: 'Hub Admin', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="admin/index"
          options={{ title: 'Admin Dashboard', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{ title: 'Notification Settings', headerBackTitle: 'Back' }}
        />
      </Stack>
    </AuthGate>
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
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AuthProvider>
                <AppProvider>
                  <RootLayoutNav />
                </AppProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
