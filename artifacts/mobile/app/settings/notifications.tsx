import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useNotificationPrefs, type NotificationPrefs } from '@/lib/notificationPrefs';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Storage, STORAGE_KEYS } from '@/lib/storage';
import { EmptyState } from '@/components/EmptyState';

interface SettingRow {
  key: keyof NotificationPrefs;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
}

const SETTINGS: SettingRow[] = [
  {
    key: 'itemDropped',
    icon: 'package',
    title: 'Item arrived at hub',
    subtitle: 'When your item is confirmed received by the hub admin',
  },
  {
    key: 'itemSold',
    icon: 'shopping-bag',
    title: 'Item sold',
    subtitle: 'When a buyer purchases one of your listed items',
  },
  {
    key: 'partnershipUpdates',
    icon: 'link',
    title: 'Partnership updates',
    subtitle: 'When a hub approves or rejects your partnership request',
  },
  {
    key: 'deadlineReminders',
    icon: 'clock',
    title: 'Deadline reminders',
    subtitle: 'Reminders when items are approaching or past their deadline',
  },
];

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, isAuthenticated } = useAuth();
  const { prefs, isLoading, updatePref } = useNotificationPrefs();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    Storage.get<string>(STORAGE_KEYS.PUSH_TOKEN).then(setPushToken);
  }, [currentUser]);

  const handleEnablePush = async () => {
    setRegistering(true);
    setTokenError('');
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await Storage.set(STORAGE_KEYS.PUSH_TOKEN, token);
      setPushToken(token);
    } else {
      setTokenError(
        Platform.OS === 'web'
          ? 'Push notifications require the mobile app.'
          : 'Permission denied or unavailable on this device.'
      );
    }
    setRegistering(false);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <EmptyState icon="bell" title="Sign in required" subtitle="Sign in to manage your notification preferences." />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Push token status card */}
      <View style={[styles.pushCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.pushIconWrap, { backgroundColor: pushToken ? colors.statusDroppedBg : colors.secondary }]}>
          <Feather
            name={pushToken ? 'bell' : 'bell-off'}
            size={20}
            color={pushToken ? colors.statusDropped : colors.primary}
          />
        </View>
        <View style={styles.pushInfo}>
          <Text style={[styles.pushTitle, { color: colors.foreground }]}>
            {pushToken ? 'Push notifications active' : 'Enable push notifications'}
          </Text>
          <Text style={[styles.pushSub, { color: colors.mutedForeground }]}>
            {pushToken
              ? 'You\'ll receive alerts even when the app is closed.'
              : 'Get notified about your items and partnerships in real time.'}
          </Text>
          {tokenError ? (
            <Text style={[styles.tokenError, { color: colors.statusExpired }]}>{tokenError}</Text>
          ) : null}
        </View>
        {!pushToken && (
          <TouchableOpacity
            style={[styles.enableBtn, { backgroundColor: colors.primary }, registering && { opacity: 0.6 }]}
            onPress={handleEnablePush}
            disabled={registering}
            activeOpacity={0.85}
          >
            {registering ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.enableBtnText}>Enable</Text>
            )}
          </TouchableOpacity>
        )}
        {pushToken && (
          <Feather name="check-circle" size={18} color={colors.statusDropped} />
        )}
      </View>

      {/* Per-event toggles */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>NOTIFY ME WHEN</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {isLoading ? (
          <ActivityIndicator style={{ padding: 24 }} color={colors.primary} />
        ) : (
          SETTINGS.map((setting, idx) => (
            <View
              key={setting.key}
              style={[
                styles.row,
                { borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.border },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={setting.icon} size={16} color={colors.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{setting.title}</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{setting.subtitle}</Text>
              </View>
              <Switch
                value={prefs[setting.key]}
                onValueChange={(v) => updatePref(setting.key, v)}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? (prefs[setting.key] ? '#fff' : colors.mutedForeground) : undefined}
              />
            </View>
          ))
        )}
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Notifications are delivered via Expo Push and only sent for events involving your account.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pushCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  pushIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pushInfo: { flex: 1 },
  pushTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  pushSub: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  tokenError: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  enableBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  enableBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', paddingHorizontal: 16, paddingBottom: 6 },
  section: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  footer: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 24, marginTop: 16, lineHeight: 18 },
});
