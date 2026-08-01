import React from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { NotificationItem } from '@/components/NotificationItem';
import { EmptyState } from '@/components/EmptyState';

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { notifications, markAllNotificationsRead, getUnreadCount } = useApp();
  const { currentUser } = useAuth();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const myNotifs = notifications
    .filter((n) => n.user_id === currentUser?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const unread = getUnreadCount();

  if (!isAuthenticated) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <EmptyState
          icon="bell"
          title="Sign in for notifications"
          subtitle="Get notified when items drop, deadlines pass, and purchases are confirmed."
          actionLabel="Sign In"
          onAction={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
            {unread > 0 && (
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>{unread} unread</Text>
            )}
          </View>
          {unread > 0 && (
            <TouchableOpacity
              style={[styles.markAllBtn, { borderColor: colors.border }]}
              onPress={markAllNotificationsRead}
              activeOpacity={0.8}
            >
              <Feather name="check" size={14} color={colors.primary} />
              <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={myNotifs}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotificationItem notification={item} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="bell"
            title="No notifications yet"
            subtitle="You'll be notified when items drop, deadlines pass, and purchases are confirmed."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  sub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  list: { padding: 16 },
});
