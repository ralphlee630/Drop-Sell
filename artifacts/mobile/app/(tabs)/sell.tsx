import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
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
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { ItemCard } from '@/components/ItemCard';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import type { ItemStatus } from '@/lib/types';

type Tab = 'items' | 'partnerships';

export default function SellScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, isAuthenticated } = useAuth();
  const { items, getSellerForCurrentUser, getMyPartnerships, getAreaById, isLoading, refreshData, becomeSeller } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [becomeSellerMode, setBecomeSellerMode] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const myProfile = getSellerForCurrentUser();
  const myPartnerships = getMyPartnerships();

  const myItems = useMemo(() => {
    if (!myProfile) return [];
    const base = items.filter((i) => i.seller_id === myProfile.id);
    if (statusFilter === 'all') return base;
    return base.filter((i) => i.status === statusFilter);
  }, [items, myProfile, statusFilter]);

  const itemStats = useMemo(() => {
    if (!myProfile) return { total: 0, dropped: 0, sold: 0, pending: 0 };
    const mine = items.filter((i) => i.seller_id === myProfile.id);
    return {
      total: mine.length,
      dropped: mine.filter((i) => i.status === 'dropped').length,
      sold: mine.filter((i) => i.status === 'sold').length,
      pending: mine.filter((i) => i.status === 'pending_dropoff').length,
    };
  }, [items, myProfile]);

  if (!isAuthenticated) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <EmptyState
          icon="package"
          title="Sign in to start selling"
          subtitle="Create an account or sign in to list your items at Baguio's drop-off hubs."
          actionLabel="Sign In"
          onAction={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  if (!myProfile && !becomeSellerMode) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Sell</Text>
        </View>
        <ScrollView contentContainerStyle={styles.centered}>
          <View style={[styles.ctaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.ctaIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="briefcase" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.ctaTitle, { color: colors.foreground }]}>Become a Seller</Text>
            <Text style={[styles.ctaSub, { color: colors.mutedForeground }]}>
              Set up your seller profile to start listing items at Baguio's drop-off hubs.
            </Text>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
              onPress={() => setBecomeSellerMode(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (becomeSellerMode) {
    const handleSubmit = async () => {
      if (!businessName.trim()) { setError('Business name is required'); return; }
      setSaving(true); setError('');
      try {
        await becomeSeller(businessName.trim(), bio.trim());
        setBecomeSellerMode(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to create profile');
      } finally {
        setSaving(false);
      }
    };

    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: topPad + 20, paddingHorizontal: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => setBecomeSellerMode(false)} style={styles.backRow}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, marginBottom: 4 }]}>Seller Profile</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground, marginBottom: 20 }]}>
          Tell buyers about your business
        </Text>
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.statusExpiredBg }]}>
            <Text style={[{ color: colors.statusExpired, fontSize: 13 }]}>{error}</Text>
          </View>
        ) : null}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Business Name *</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="e.g. Baguio Finds"
          placeholderTextColor={colors.mutedForeground}
          value={businessName}
          onChangeText={setBusinessName}
        />
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Bio (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Describe what you sell..."
          placeholderTextColor={colors.mutedForeground}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: colors.primary, marginTop: 20 }, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaBtnText}>Create Seller Profile</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Seller dashboard ─────────────────────────────────────────────────────
  const FILTERS: { key: ItemStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending_dropoff', label: 'Pending' },
    { key: 'dropped', label: 'Dropped' },
    { key: 'sold', label: 'Sold' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>{myProfile!.business_name}</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {myProfile!.verified ? '✓ Verified seller' : 'Seller account'}
            </Text>
          </View>
          {activeTab === 'items' && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/sell/new-item')}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>List Item</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: 'Total', value: itemStats.total, color: colors.foreground },
            { label: 'Pending', value: itemStats.pending, color: colors.statusPending },
            { label: 'Dropped', value: itemStats.dropped, color: colors.statusDropped },
            { label: 'Sold', value: itemStats.sold, color: colors.statusSold },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {([['items', 'Listings'], ['partnerships', 'Partnerships']] as const).map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.tab, activeTab === key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab(key)}>
              <Text style={[styles.tabText, { color: activeTab === key ? colors.primary : colors.mutedForeground }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Items tab */}
      {activeTab === 'items' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, { backgroundColor: statusFilter === f.key ? colors.primary : colors.card, borderColor: statusFilter === f.key ? colors.primary : colors.border }]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, { color: statusFilter === f.key ? '#fff' : colors.mutedForeground }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <FlatList
            data={myItems}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => {
              const area = getAreaById(item.dropping_area_id);
              return <ItemCard item={item} showArea areaName={area?.name} />;
            }}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshData} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="package"
                title="No items yet"
                subtitle="List your first item at a drop-off hub to start selling."
                actionLabel="List an Item"
                onAction={() => router.push('/sell/new-item')}
              />
            }
          />
        </>
      )}

      {/* Partnerships tab */}
      {activeTab === 'partnerships' && (
        <FlatList
          data={myPartnerships}
          keyExtractor={(p) => p.id}
          renderItem={({ item: partnership }) => {
            const area = getAreaById(partnership.dropping_area_id);
            if (!area) return null;
            return (
              <View style={styles.partnerRow}>
                <View style={[styles.partnerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.partnerInfo}>
                    <Text style={[styles.partnerName, { color: colors.foreground }]}>{area.name}</Text>
                    <Text style={[styles.partnerAddr, { color: colors.mutedForeground }]}>{area.address}</Text>
                  </View>
                  <StatusBadge status={partnership.status} size="sm" />
                </View>
              </View>
            );
          }}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          ListHeaderComponent={
            <TouchableOpacity
              style={[styles.requestBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/sell/partnerships')}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.requestBtnText}>Request Partnership</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <EmptyState
              icon="link"
              title="No partnerships yet"
              subtitle="Request a partnership with a dropping area to start listing items there."
              actionLabel="Browse Areas"
              onAction={() => router.push('/sell/partnerships')}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 0, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  statsRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 1 },
  statDivider: { width: 1, marginVertical: 2 },
  tabRow: { flexDirection: 'row' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  filterScroll: { maxHeight: 48 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: { borderRadius: 100, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  listContent: { padding: 16 },
  centered: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  ctaCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center' },
  ctaIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ctaTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 8, textAlign: 'center' },
  ctaSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  ctaBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  ctaBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  textInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular' },
  textArea: { height: 100, textAlignVertical: 'top' },
  errorBox: { borderRadius: 8, padding: 10, marginBottom: 12 },
  partnerRow: { paddingHorizontal: 16, marginBottom: 2 },
  partnerCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14 },
  partnerInfo: { flex: 1 },
  partnerName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  partnerAddr: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  requestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', margin: 16 },
  requestBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
