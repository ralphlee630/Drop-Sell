import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { ItemCard } from '@/components/ItemCard';
import { SellerCard } from '@/components/SellerCard';
import { EmptyState } from '@/components/EmptyState';
import type { ItemStatus } from '@/lib/types';

type Filter = 'all' | ItemStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'dropped', label: 'Dropped' },
  { key: 'pending_dropoff', label: 'Pending' },
  { key: 'sold', label: 'Sold' },
];

export default function AreaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getAreaById, getItemsByArea, getPartnerSellersForArea, getSellerById, isLoading, refreshData } = useApp();
  const [filter, setFilter] = useState<Filter>('all');

  const area = getAreaById(id ?? '');
  const allItems = getItemsByArea(id ?? '');
  const sellers = getPartnerSellersForArea(id ?? '');

  const filteredItems = useMemo(
    () => (filter === 'all' ? allItems : allItems.filter((i) => i.status === filter)),
    [allItems, filter]
  );

  if (!area) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <EmptyState icon="map-pin" title="Area not found" />
      </View>
    );
  }

  const droppedCount = allItems.filter((i) => i.status === 'dropped').length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Area Hero */}
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroIcon}>
          <Feather name="package" size={28} color={colors.primary} />
        </View>
        <Text style={styles.heroName}>{area.name}</Text>
        <View style={styles.heroMeta}>
          <Feather name="map-pin" size={13} color="rgba(255,255,255,0.75)" />
          <Text style={styles.heroAddr}>{area.address}</Text>
        </View>
        <View style={styles.heroMeta}>
          <Feather name="phone" size={13} color="rgba(255,255,255,0.75)" />
          <Text style={styles.heroAddr}>{area.contact_info}</Text>
        </View>
        {/* Stats row */}
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{droppedCount}</Text>
            <Text style={styles.heroStatLabel}>Ready</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{allItems.length}</Text>
            <Text style={styles.heroStatLabel}>Total Items</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{sellers.length}</Text>
            <Text style={styles.heroStatLabel}>Sellers</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => {
          const seller = getSellerById(item.seller_id);
          return <ItemCard item={item} sellerName={seller?.business_name} />;
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshData} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {/* Partner sellers */}
            {sellers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Partner Sellers</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sellerScroll}>
                  {sellers.map((s) => {
                    const count = allItems.filter((i) => i.seller_id === s.id).length;
                    return <SellerCard key={s.id} seller={s} itemCount={count} compact />;
                  })}
                </ScrollView>
              </View>
            )}

            {/* Filter tabs */}
            <View style={styles.filterSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Items</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterChip,
                      { backgroundColor: filter === f.key ? colors.primary : colors.card, borderColor: filter === f.key ? colors.primary : colors.border },
                    ]}
                    onPress={() => setFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterText, { color: filter === f.key ? '#fff' : colors.mutedForeground }]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="package"
            title={filter === 'all' ? 'No items yet' : `No ${filter.replace('_', ' ')} items`}
            subtitle="Items listed by partner sellers will appear here."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroName: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  heroAddr: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.85)' },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatNum: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  heroStatLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  list: { paddingHorizontal: 16 },
  section: { marginBottom: 16, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  sellerScroll: { marginHorizontal: -4 },
  filterSection: { marginBottom: 12 },
  filterRow: { gap: 8, paddingBottom: 4 },
  filterChip: { borderRadius: 100, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
