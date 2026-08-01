import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { ItemStatus, PartnershipStatus, DroppingAreaStatus } from '@/lib/types';

type BadgeStatus = ItemStatus | PartnershipStatus | DroppingAreaStatus;

interface Props {
  status: BadgeStatus;
  size?: 'sm' | 'md';
}

function getConfig(status: BadgeStatus, colors: ReturnType<typeof useColors>) {
  switch (status) {
    case 'pending_dropoff': return { label: 'Pending Drop-off', color: colors.statusPending, bg: colors.statusPendingBg };
    case 'dropped':         return { label: 'Dropped', color: '#fff', bg: colors.statusDropped };
    case 'sold':            return { label: 'Sold', color: '#fff', bg: colors.statusSold };
    case 'expired':         return { label: 'Expired', color: '#fff', bg: colors.statusExpired };
    case 'cancelled':       return { label: 'Cancelled', color: colors.statusCancelled, bg: colors.statusCancelledBg };
    case 'pending':         return { label: 'Pending', color: colors.partnerPending, bg: colors.partnerPendingBg };
    case 'approved':        return { label: 'Approved', color: '#fff', bg: colors.partnerApproved };
    case 'rejected':        return { label: 'Rejected', color: '#fff', bg: colors.partnerRejected };
    case 'terminated':      return { label: 'Terminated', color: colors.statusCancelled, bg: colors.statusCancelledBg };
    case 'active':          return { label: 'Active', color: '#fff', bg: colors.statusSold };
    case 'suspended':       return { label: 'Suspended', color: '#fff', bg: colors.statusExpired };
    case 'pending_approval':return { label: 'Pending Approval', color: colors.partnerPending, bg: colors.partnerPendingBg };
    default:                return { label: String(status), color: colors.mutedForeground, bg: colors.muted };
  }
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const colors = useColors();
  const { label, color, bg } = getConfig(status, colors);
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.small]}>
      <Text style={[styles.label, { color }, isSmall && styles.labelSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  small: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  labelSmall: {
    fontSize: 10,
  },
});
