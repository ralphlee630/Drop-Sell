import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { calculateCurrentFee, formatPeso, isOverdue as checkOverdue } from '@/lib/feeCalculations';
import type { Item } from '@/lib/types';

interface Props {
  item: Item;
}

export function FeeBreakdown({ item }: Props) {
  const colors = useColors();
  const overdue = checkOverdue(item);
  const currentFee = calculateCurrentFee(item);
  const total = item.amount + currentFee;

  const Row = ({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) => (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.mutedForeground }, bold && { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: color ?? colors.foreground }, bold && styles.valueBold]}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.heading, { color: colors.foreground }]}>Price Breakdown</Text>
      <Row label="Item price" value={formatPeso(item.amount)} />
      <Row label="Base handling fee" value={formatPeso(item.base_handling_fee)} />
      {overdue && (
        <View>
          <Row
            label="Late fee"
            value={`+${formatPeso(item.late_handling_fee)}`}
            color={colors.statusExpired}
          />
          <View style={[styles.alert, { backgroundColor: colors.statusExpiredBg }]}>
            <Feather name="alert-circle" size={12} color={colors.statusExpired} />
            <Text style={[styles.alertText, { color: colors.statusExpired }]}>
              Deadline passed — late fee applies
            </Text>
          </View>
        </View>
      )}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Row label="Total" value={formatPeso(total)} bold color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  heading: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  value: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  valueBold: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  divider: { height: 1, marginVertical: 8 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  alertText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
