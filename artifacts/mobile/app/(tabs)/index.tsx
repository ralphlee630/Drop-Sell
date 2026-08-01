import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { DroppingAreaCard } from '@/components/DroppingAreaCard';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { EmptyState } from '@/components/EmptyState';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { droppingAreas, items, sellerProfiles, getUnreadCount, isLoading, refreshData } = useApp();
  const [search, setSearch] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const unread = getUnreadCount();

  const activeAreas = useMemo(
    () => droppingAreas.filter((a) => a.status === 'active'),
    [droppingAreas]
  );

  const filtered = useMemo(
    () =>
      search.trim()
        ? activeAreas.filter(
            (a) =>
              a.name.toLowerCase().includes(search.toLowerCase()) ||
              a.address.toLowerCase().includes(search.toLowerCase())
          )
        : activeAreas,
    [activeAreas, search]
  );

  const droppedCount = useMemo(
    () => items.filter((i) => i.status === 'dropped').length,
    [items]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <DroppingAreaCard area={item} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            {/* App header */}
            <View style={[styles.headerArea, { paddingTop: topPad + 8, backgroundColor: colors.primary }]}>
              <View style={styles.headerTop}>
                <View style={styles.brandRow}>
                  <View style={styles.brandIcon}>
                    <Feather name="package" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.brandName}>Drop &amp; Sell</Text>
                    <Text style={styles.brandTag}>Baguio's trusted drop-off marketplace</Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  {isAuthenticated && (
                    <TouchableOpacity
                      style={styles.bellBtn}
                      onPress={() => router.push('/(tabs)/notifications')}
                    >
                      <Feather name="bell" size={20} color="#fff" />
                      {unread > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  {!isAuthenticated && (
                    <TouchableOpacity
                      style={styles.signInBtn}
                      onPress={() => router.push('/(auth)/login')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.signInText}>Sign In</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Stats pill */}
              <View style={styles.statsPill}>
                <View style={styles.pillStat}>
                  <Text style={styles.pillNum}>{activeAreas.length}</Text>
                  <Text style={styles.pillLabel}>Hubs</Text>
                </View>
                <View style={styles.pillDivider} />
                <View style={styles.pillStat}>
                  <Text style={styles.pillNum}>{droppedCount}</Text>
                  <Text style={styles.pillLabel}>Ready to Buy</Text>
                </View>
                <View style={styles.pillDivider} />
                <View style={styles.pillStat}>
                  <Text style={styles.pillNum}>{sellerProfiles.length}</Text>
                  <Text style={styles.pillLabel}>Sellers</Text>
                </View>
              </View>
            </View>

            {/* Search */}
            <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
              <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search dropping areas..."
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {search ? `Results for "${search}"` : 'Active Hubs in Baguio'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletons}>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : (
            <EmptyState
              icon="map-pin"
              title={search ? 'No results' : 'No dropping areas yet'}
              subtitle={search ? `No areas match "${search}"` : 'Active dropping areas will appear here.'}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 16 },
  headerArea: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  brandTag: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  signInBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  signInText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  statsPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, padding: 12,
  },
  pillStat: { flex: 1, alignItems: 'center' },
  pillNum: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' },
  pillLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  pillDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  skeletons: { paddingTop: 8 },
});
