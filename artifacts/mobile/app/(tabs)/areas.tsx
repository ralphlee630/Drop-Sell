import React, { useState, useMemo } from 'react';
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
import { DroppingAreaCard } from '@/components/DroppingAreaCard';
import { EmptyState } from '@/components/EmptyState';
import AreaMapView from '@/components/AreaMapView';

export default function AreasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { droppingAreas, isLoading, refreshData } = useApp();

  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [search, setSearch] = useState('');

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

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Dropping Areas</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {activeAreas.length} active hubs in Baguio City
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/areas/register')}
            activeOpacity={0.85}
          >
            <Feather name="plus-circle" size={15} color={colors.primary} />
            <Text style={[styles.registerBtnText, { color: colors.primary }]}>Register Hub</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search areas..."
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

        {/* Toggle */}
        <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
          {(['list', 'map'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.toggleBtn, mode === m && { backgroundColor: colors.card }]}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
            >
              <Feather name={m === 'list' ? 'list' : 'map'} size={15} color={mode === m ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.toggleText, { color: mode === m ? colors.primary : colors.mutedForeground }]}>
                {m === 'list' ? 'List' : 'Map'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {mode === 'map' ? (
        <View style={styles.map}>
          <AreaMapView areas={activeAreas} primaryColor={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <DroppingAreaCard area={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshData} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="map-pin"
              title={search ? 'No results' : 'No dropping areas yet'}
              subtitle={search ? `No areas match "${search}"` : 'Dropping areas will appear here once approved.'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  sub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  registerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 2 },
  registerBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  toggle: { flexDirection: 'row', borderRadius: 10, padding: 3, alignSelf: 'flex-start' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  toggleText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  list: { padding: 16 },
  map: { flex: 1 },
  callout: { width: 200, padding: 4 },
  calloutTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  calloutAddr: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  calloutTap: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
});
