import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { timeAgo } from '@/lib/feeCalculations';
import { useApp } from '@/context/AppContext';
import type { AppNotification, NotificationType } from '@/lib/types';

const TYPE_CONFIG: Record<NotificationType, { icon: keyof typeof Feather.glyphMap; colorKey: string }> = {
  item_dropped:       { icon: 'package', colorKey: 'statusDropped' },
  item_sold:          { icon: 'shopping-bag', colorKey: 'statusSold' },
  deadline_passed:    { icon: 'clock', colorKey: 'statusExpired' },
  fee_updated:        { icon: 'alert-circle', colorKey: 'partnerPending' },
  purchase_confirmed: { icon: 'check-circle', colorKey: 'statusSold' },
  partnership_approved: { icon: 'link', colorKey: 'partnerApproved' },
  partnership_rejected: { icon: 'link', colorKey: 'partnerRejected' },
};

interface Props {
  notification: AppNotification;
}

export function NotificationItem({ notification }: Props) {
  const colors = useColors();
  const { markNotificationRead } = useApp();
  const config = TYPE_CONFIG[notification.type];
  const iconColor = (colors as unknown as Record<string, string>)[config.colorKey] ?? colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: notification.is_read ? colors.card : colors.secondary, borderColor: colors.border },
      ]}
      onPress={() => markNotificationRead(notification.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Feather name={config.icon} size={18} color={iconColor} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]}>{notification.title}</Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(notification.created_at)}</Text>
      </View>
      {!notification.is_read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1 },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 3 },
  message: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
});
