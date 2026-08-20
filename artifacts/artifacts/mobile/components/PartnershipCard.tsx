import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { StatusBadge } from './StatusBadge';
import { timeAgo } from '@/lib/feeCalculations';
import type { DroppingArea, Partnership } from '@/lib/types';

interface Props {
  partnership: Partnership;
  area: DroppingArea;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export function PartnershipCard({ partnership, area, onApprove, onReject, showActions }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="map-pin" size={18} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{area.name}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{area.address}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            Requested {timeAgo(partnership.requested_at)}
          </Text>
        </View>
        <StatusBadge status={partnership.status} size="sm" />
      </View>

      {showActions && partnership.status === 'pending' && onApprove && onReject && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.statusExpiredBg }]}
            onPress={onReject}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, { color: colors.statusExpired }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={onApprove}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, { color: '#fff' }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  actions: { flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 8 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
