import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import type { DroppingArea } from '@/lib/types';

interface Props {
  area: DroppingArea;
}

export function DroppingAreaCard({ area }: Props) {
  const colors = useColors();
  const { getPartnerSellersForArea, getItemsByArea } = useApp();

  const sellers = getPartnerSellersForArea(area.id);
  const items = getItemsByArea(area.id);
  const droppedCount = items.filter((i) => i.status === 'dropped').length;
  const totalActive = items.filter((i) => i.status === 'pending_dropoff' || i.status === 'dropped').length;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/area/${area.id}`)}
      activeOpacity={0.85}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconBadge, { backgroundColor: colors.secondary }]}>
          <Feather name="package" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{area.name}</Text>
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
              {' '}{area.address}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{totalActive}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active Items</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.statusDropped }]}>{droppedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Ready to Buy</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.foreground }]}>{sellers.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Sellers</Text>
        </View>
      </View>

      {/* Seller chips */}
      {sellers.length > 0 && (
        <View style={styles.sellerRow}>
          {sellers.slice(0, 3).map((s) => (
            <View key={s.id} style={[styles.chip, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
                {s.business_name}
              </Text>
            </View>
          ))}
          {sellers.length > 3 && (
            <Text style={[styles.moreText, { color: colors.mutedForeground }]}>+{sellers.length - 3} more</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  address: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 1 },
  divider: { width: 1, marginVertical: 4 },
  sellerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  chip: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  moreText: { fontSize: 11, fontFamily: 'Inter_400Regular', alignSelf: 'center' },
});
