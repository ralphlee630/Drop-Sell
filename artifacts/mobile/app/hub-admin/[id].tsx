import React, { useState, useMemo } from 'react';
import {
  Alert,
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
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { PartnershipCard } from '@/components/PartnershipCard';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { formatPeso, timeAgo, calculateTotal } from '@/lib/feeCalculations';

type Tab = 'drop' | 'requests';

export default function HubAdminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { getAreaById, getItemsByArea, partnerships, getSellerById, markItemDropped, approvePartnership, rejectPartnership, isLoading, refreshData } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>('drop');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const area = getAreaById(id ?? '');
  const allItems = getItemsByArea(id ?? '');

  const pendingItems = useMemo(
    () => allItems.filter((i) => i.status === 'pending_dropoff'),
    [allItems]
  );

  const droppedItems = useMemo(
    () => allItems.filter((i) => i.status === 'dropped'),
    [allItems]
  );

  const pendingPartnerships = useMemo(
    () => partnerships.filter((p) => p.dropping_area_id === id && p.status === 'pending'),
    [partnerships, id]
  );

  if (!area) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <EmptyState icon="shield" title="Hub not found" />
      </View>
    );
  }

  if (area.admin_user_id !== currentUser?.id && currentUser?.role !== 'super_admin') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <EmptyState icon="lock" title="Access denied" subtitle="You don't have permission to manage this hub." />
      </View>
    );
  }

  const handleMarkDropped = (itemId: string, itemTitle: string) => {
    Alert.alert(
      'Confirm Drop-off',
      `Mark "${itemTitle}" as received at this hub?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Drop-off',
          style: 'default',
          onPress: () => markItemDropped(itemId),
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: 16 }]}>
        <View style={styles.shieldBadge}>
          <Feather name="shield" size={20} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>{area.name}</Text>
        <Text style={styles.headerSub}>Hub Admin Dashboard</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{pendingItems.length}</Text>
            <Text style={styles.headerStatLabel}>Awaiting Drop</Text>
          </View>
          <View style={[styles.headerStatDivider]} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{droppedItems.length}</Text>
            <Text style={styles.headerStatLabel}>Dropped</Text>
          </View>
          <View style={[styles.headerStatDivider]} />
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, pendingPartnerships.length > 0 && { color: '#FBBF24' }]}>
              {pendingPartnerships.length}
            </Text>
            <Text style={styles.headerStatLabel}>Pending Requests</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([['drop', 'Drop-off Queue', pendingItems.length], ['requests', 'Partnership Requests', pendingPartnerships.length]] as const).map(([key, label, count]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(key as Tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === key ? colors.primary : colors.mutedForeground }]}>{label}</Text>
            {count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === key ? colors.primary : colors.muted }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === key ? '#fff' : colors.mutedForeground }]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Drop-off Queue */}
      {activeTab === 'drop' && (
        <FlatList
          data={pendingItems}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const seller = getSellerById(item.seller_id);
            return (
              <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
                    <Text style={[styles.itemCode, { color: colors.mutedForeground }]}>{item.product_code}</Text>
                    {seller && (
                      <Text style={[styles.itemSeller, { color: colors.mutedForeground }]}>
                        by {seller.business_name}
                      </Text>
                    )}
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
                <View style={[styles.itemDetails, { borderTopColor: colors.border }]}>
                  <Text style={[styles.itemAmount, { color: colors.primary }]}>
                    {formatPeso(calculateTotal(item))}
                  </Text>
                  {item.buyer_name && (
                    <View style={[styles.reservedFor, { backgroundColor: colors.secondary }]}>
                      <Feather name="user" size={11} color={colors.primary} />
                      <Text style={[styles.reservedText, { color: colors.primary }]}>For {item.buyer_name}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.dropBtn, { backgroundColor: colors.statusDropped }]}
                    onPress={() => handleMarkDropped(item.id, item.title)}
                    activeOpacity={0.85}
                  >
                    <Feather name="check" size={15} color="#fff" />
                    <Text style={styles.dropBtnText}>Mark Dropped</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshData} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="package"
              title="Queue is clear"
              subtitle="All items have been marked as dropped or there are no pending items."
            />
          }
        />
      )}

      {/* Partnership requests */}
      {activeTab === 'requests' && (
        <FlatList
          data={pendingPartnerships}
          keyExtractor={(p) => p.id}
          renderItem={({ item: partnership }) => {
            const area2 = getAreaById(partnership.dropping_area_id);
            if (!area2) return null;
            return (
              <PartnershipCard
                partnership={partnership}
                area={area2}
                showActions
                onApprove={() => approvePartnership(partnership.id)}
                onReject={() => rejectPartnership(partnership.id)}
              />
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="link"
              title="No pending requests"
              subtitle="New seller partnership requests will appear here for your approval."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  shieldBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 2 },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginBottom: 12 },
  headerStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10 },
  headerStat: { flex: 1, alignItems: 'center' },
  headerStatNum: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerStatLabel: { fontSize: 9, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 2 },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  tabBadge: { borderRadius: 100, paddingHorizontal: 6, paddingVertical: 2 },
  tabBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  list: { padding: 16 },
  itemCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  itemTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  itemCode: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  itemSeller: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  itemDetails: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  itemAmount: { fontSize: 16, fontFamily: 'Inter_700Bold', flex: 1 },
  reservedFor: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  reservedText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  dropBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  dropBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
