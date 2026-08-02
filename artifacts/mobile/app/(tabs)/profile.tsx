import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { formatPeso } from '@/lib/feeCalculations';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, isAuthenticated, logout } = useAuth();
  const { transactions, items, getSellerForCurrentUser, droppingAreas } = useApp();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (!isAuthenticated || !currentUser) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <EmptyState
          icon="user"
          title="Sign in to view your profile"
          subtitle="Track your purchases, manage your seller profile, and more."
          actionLabel="Sign In"
          onAction={() => router.push('/(auth)/login')}
        />
        <View style={styles.authBtns}>
          <TouchableOpacity
            style={[styles.authBtn, { backgroundColor: colors.muted }]}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.8}
          >
            <Text style={[styles.authBtnText, { color: colors.foreground }]}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const myProfile = getSellerForCurrentUser();
  const myTransactions = transactions.filter((t) => t.buyer_id === currentUser.id);
  const managedArea = droppingAreas.find((a) => a.admin_user_id === currentUser.id);

  const MenuItem = ({
    icon,
    label,
    onPress,
    danger,
    badge,
  }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; danger?: boolean; badge?: string }) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: danger ? colors.statusExpiredBg : colors.secondary }]}>
        <Feather name={icon} size={18} color={danger ? colors.statusExpired : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? colors.statusExpired : colors.foreground }]}>{label}</Text>
      {badge && (
        <View style={[styles.menuBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      {!danger && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={[styles.profileHeader, { paddingTop: topPad + 12, backgroundColor: colors.primary }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{currentUser.full_name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{currentUser.full_name}</Text>
        <Text style={styles.profileEmail}>{currentUser.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={styles.roleText}>{currentUser.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
        </View>
      </View>

      {/* Purchase stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{myTransactions.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Purchases</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.statusSold }]}>
            {formatPeso(myTransactions.reduce((s, t) => s + t.total_amount, 0))}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
        </View>
      </View>

      {/* Seller profile section */}
      {myProfile && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SELLER PROFILE</Text>
          <View style={styles.sellerInfo}>
            <Text style={[styles.sellerName, { color: colors.foreground }]}>{myProfile.business_name}</Text>
            {myProfile.verified && (
              <View style={styles.verifiedRow}>
                <Feather name="check-circle" size={13} color={colors.statusDropped} />
                <Text style={[{ color: colors.statusDropped, fontSize: 12 }]}>Verified</Text>
              </View>
            )}
          </View>
          {myProfile.bio ? (
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>{myProfile.bio}</Text>
          ) : null}
        </View>
      )}

      {/* Purchase history */}
      {myTransactions.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECENT PURCHASES</Text>
          {myTransactions.slice(0, 5).map((txn) => {
            const item = items.find((i) => i.id === txn.item_id);
            return (
              <View key={txn.id} style={[styles.txnRow, { borderTopColor: colors.border }]}>
                <View style={styles.txnInfo}>
                  <Text style={[styles.txnTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item?.title ?? 'Item'}
                  </Text>
                  <Text style={[styles.txnCode, { color: colors.mutedForeground }]}>
                    {item?.product_code}
                  </Text>
                </View>
                <View style={styles.txnRight}>
                  <Text style={[styles.txnAmount, { color: colors.primary }]}>
                    {formatPeso(txn.total_amount)}
                  </Text>
                  <StatusBadge status={txn.status} size="sm" />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Menu */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        {managedArea && (
          <MenuItem
            icon="shield"
            label={`Hub Admin — ${managedArea.name}`}
            onPress={() => router.push(`/hub-admin/${managedArea.id}`)}
          />
        )}
        {currentUser.role === 'super_admin' && (
          <MenuItem icon="sliders" label="Admin Dashboard" onPress={() => router.push('/admin')} />
        )}
        {!myProfile && (
          <MenuItem icon="briefcase" label="Become a Seller" onPress={() => router.push('/(tabs)/sell')} />
        )}
        {myProfile && (
          <MenuItem icon="link" label="Manage Partnerships" onPress={() => router.push('/sell/partnerships')} />
        )}
        <MenuItem
          icon="bell"
          label="Notification Settings"
          onPress={() => router.push('/settings/notifications')}
        />
        <MenuItem icon="log-out" label="Sign Out" onPress={logout} danger />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#fff' },
  profileName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 2 },
  profileEmail: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  roleBadge: { borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#fff' },
  statsCard: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  section: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  sellerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 4 },
  sellerName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bio: { fontSize: 13, fontFamily: 'Inter_400Regular', paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  menuBadge: { borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  menuBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  txnInfo: { flex: 1 },
  txnTitle: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  txnCode: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  txnRight: { alignItems: 'flex-end', gap: 4 },
  txnAmount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  authBtns: { paddingHorizontal: 24, paddingTop: 12 },
  authBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  authBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
