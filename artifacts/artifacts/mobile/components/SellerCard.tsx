import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { SellerProfile } from '@/lib/types';

interface Props {
  seller: SellerProfile;
  itemCount?: number;
  onPress?: () => void;
  compact?: boolean;
}

export function SellerCard({ seller, itemCount, onPress, compact }: Props) {
  const colors = useColors();

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compact, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {seller.business_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <View style={styles.nameRow}>
            <Text style={[styles.compactName, { color: colors.foreground }]} numberOfLines={1}>
              {seller.business_name}
            </Text>
            {seller.verified && (
              <Feather name="check-circle" size={12} color={colors.statusDropped} />
            )}
          </View>
          {itemCount !== undefined && (
            <Text style={[styles.compactMeta, { color: colors.mutedForeground }]}>
              {itemCount} items
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {seller.business_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{seller.business_name}</Text>
            {seller.verified && (
              <View style={styles.verifiedRow}>
                <Feather name="check-circle" size={13} color={colors.statusDropped} />
                <Text style={[styles.verifiedText, { color: colors.statusDropped }]}>Verified</Text>
              </View>
            )}
          </View>
          {itemCount !== undefined && (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{itemCount} items listed</Text>
          )}
        </View>
      </View>
      {seller.bio ? (
        <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>
          {seller.bio}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  compact: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
    width: 150,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headerInfo: { flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  compactName: { fontSize: 12, fontFamily: 'Inter_600SemiBold', maxWidth: 90 },
  compactMeta: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  bio: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
