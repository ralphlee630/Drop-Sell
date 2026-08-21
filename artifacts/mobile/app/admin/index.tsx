import React from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { droppingAreas, sellerProfiles, items, transactions, approveArea } = useApp();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (currentUser?.role !== 'super_admin') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <EmptyState icon="lock" title="Super Admin only" subtitle="This section is restricted to platform administrators." />
      </View>
    );
  }

  const pendingAreas = droppingAreas.filter((a) => a.status === 'pending_approval');
  const activeAreas = droppingAreas.filter((a) => a.status === 'active');
  const totalItems = items.length;
  const totalTxns = transactions.length;
  const totalRevenue = transactions.reduce((s, t) => s + t.total_amount, 0);

  const StatCard = ({ icon, label, value, color }: { icon: keyof typeof Feather.glyphMap; label: string; value: string | number; color?: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={18} color={color ?? colors.primary} />
      </View>
      <Text style={[styles.statValue, { color: color ?? colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );

  return (
    <FlatList
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <View>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: 16 }]}>
            <View style={styles.adminBadge}>
              <Feather name="sliders" size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Super Admin</Text>
            <Text style={styles.headerSub}>Platform Overview — Baguio City</Text>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatCard icon="map-pin" label="Active Hubs" value={activeAreas.length} />
            <StatCard icon="users" label="Verified Sellers" value={sellerProfiles.filter((s) => s.verified).length} />
            <StatCard icon="package" label="Total Items" value={totalItems} color={colors.statusDropped} />
            <StatCard icon="shopping-bag" label="Transactions" value={totalTxns} color={colors.statusSold} />
          </View>

          {/* Pending area approvals */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Pending Hub Approvals ({pendingAreas.length})
          </Text>
          {pendingAreas.length === 0 && (
            <View style={[styles.emptyNote, { backgroundColor: colors.muted }]}>
              <Feather name="check-circle" size={14} color={colors.statusSold} />
              <Text style={[styles.emptyNoteText, { color: colors.mutedForeground }]}>No pending hub approvals</Text>
            </View>
          )}
          {pendingAreas.map((area) => (
            <View key={area.id} style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.pendingInfo}>
                <Text style={[styles.pendingName, { color: colors.foreground }]}>{area.name}</Text>
                <Text style={[styles.pendingAddr, { color: colors.mutedForeground }]}>{area.address}</Text>
                <StatusBadge status={area.status} size="sm" />
              </View>
              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: colors.statusSold }]}
                onPress={() => approveArea(area.id)}
                activeOpacity={0.85}
              >
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Active hubs summary */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>
            Active Hubs ({activeAreas.length})
          </Text>
          {activeAreas.map((area) => {
            const areaItems = items.filter((i) => i.dropping_area_id === area.id);
            return (
              <View key={area.id} style={[styles.activeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.activeName, { color: colors.foreground }]}>{area.name}</Text>
                <Text style={[styles.activeAddr, { color: colors.mutedForeground }]}>{area.address}</Text>
                <View style={styles.activeStats}>
                  <Text style={[styles.activeStat, { color: colors.statusDropped }]}>
                    {areaItems.filter((i) => i.status === 'dropped').length} ready
                  </Text>
                  <Text style={[styles.activeStat, { color: colors.mutedForeground }]}>·</Text>
                  <Text style={[styles.activeStat, { color: colors.foreground }]}>
                    {areaItems.length} total items
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: {},
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  adminBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 2 },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { borderRadius: 14, borderWidth: 1, padding: 14, width: '47%', alignItems: 'center', gap: 6 },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', paddingHorizontal: 16, marginBottom: 10 },
  emptyNote: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginHorizontal: 16, marginBottom: 10 },
  emptyNoteText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  pendingCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginHorizontal: 16, marginBottom: 10, gap: 12 },
  pendingInfo: { flex: 1, gap: 4 },
  pendingName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  pendingAddr: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  approveBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  activeCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginHorizontal: 16, marginBottom: 8 },
  activeName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  activeAddr: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 6 },
  activeStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeStat: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
