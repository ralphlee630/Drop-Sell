import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { StatusBadge } from './StatusBadge';
import { formatPeso, formatDeadlineCountdown, timeAgo } from '@/lib/feeCalculations';
import { calculateCurrentFee } from '@/lib/feeCalculations';
import type { Item } from '@/lib/types';

interface Props {
  item: Item;
  sellerName?: string;
  showArea?: boolean;
  areaName?: string;
}

export function ItemCard({ item, sellerName, showArea, areaName }: Props) {
  const colors = useColors();
  const { label: deadlineLabel, isOverdue, isUrgent } = formatDeadlineCountdown(item.deadline_at);
  const fee = calculateCurrentFee(item);
  const total = item.amount + fee;

  const deadlineColor = isOverdue ? colors.statusExpired : isUrgent ? colors.partnerPending : colors.mutedForeground;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/item/${item.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        {/* Photo placeholder */}
        <View style={[styles.photo, { backgroundColor: colors.muted }]}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Feather name="image" size={22} color={colors.mutedForeground} />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
            <StatusBadge status={item.status} size="sm" />
          </View>

          <Text style={[styles.code, { color: colors.mutedForeground }]}>{item.product_code}</Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>{formatPeso(total)}</Text>
            {isOverdue && (
              <View style={[styles.lateBadge, { backgroundColor: colors.statusExpiredBg }]}>
                <Text style={[styles.lateText, { color: colors.statusExpired }]}>Late fee</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {item.dropped_at ? (
              <View style={styles.metaItem}>
                <Feather name="check-circle" size={11} color={colors.statusDropped} />
                <Text style={[styles.metaText, { color: colors.statusDropped }]}>
                  {' '}Dropped {timeAgo(item.dropped_at)}
                </Text>
              </View>
            ) : (
              <View style={styles.metaItem}>
                <Feather name="clock" size={11} color={deadlineColor} />
                <Text style={[styles.metaText, { color: deadlineColor }]}> {deadlineLabel}</Text>
              </View>
            )}
            {sellerName && (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                · {sellerName}
              </Text>
            )}
          </View>

          {showArea && areaName && (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {' '}{areaName}
              </Text>
            </View>
          )}

          {item.buyer_name && (
            <View style={[styles.reservedBadge, { backgroundColor: colors.secondary }]}>
              <Feather name="user" size={10} color={colors.primary} />
              <Text style={[styles.reservedText, { color: colors.primary }]}> Reserved</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', padding: 12, gap: 12 },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1, lineHeight: 18 },
  code: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  price: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  lateBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  lateText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  reservedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  reservedText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
});
