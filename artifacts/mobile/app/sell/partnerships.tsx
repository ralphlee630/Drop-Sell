import React, { useMemo } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { PartnershipCard } from '@/components/PartnershipCard';
import { EmptyState } from '@/components/EmptyState';

export default function PartnershipsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { droppingAreas, getSellerForCurrentUser, getMyPartnerships, getAreaById, requestPartnership } = useApp();

  const myProfile = getSellerForCurrentUser();
  const myPartnerships = getMyPartnerships();

  const availableAreas = useMemo(() => {
    const alreadyRequestedAreaIds = myPartnerships.map((p) => p.dropping_area_id);
    return droppingAreas.filter(
      (a) => a.status === 'active' && !alreadyRequestedAreaIds.includes(a.id)
    );
  }, [droppingAreas, myPartnerships]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (!isAuthenticated || !myProfile) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <EmptyState icon="link" title="Seller profile required" subtitle="Create a seller profile first to manage partnerships." />
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      data={myPartnerships}
      keyExtractor={(p) => p.id}
      renderItem={({ item: partnership }) => {
        const area = getAreaById(partnership.dropping_area_id);
        if (!area) return null;
        return <PartnershipCard partnership={partnership} area={area} />;
      }}
      ListHeaderComponent={
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Partnerships</Text>
          {myPartnerships.length === 0 && (
            <View style={[styles.emptyNote, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.emptyNoteText, { color: colors.mutedForeground }]}>
                No partnerships yet. Request one below to start listing items.
              </Text>
            </View>
          )}
        </View>
      }
      ListFooterComponent={
        availableAreas.length > 0 ? (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
              Available Dropping Areas
            </Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              Request a partnership to list items at these hubs
            </Text>
            {availableAreas.map((area) => (
              <View key={area.id} style={[styles.availableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.areaIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="map-pin" size={18} color={colors.primary} />
                </View>
                <View style={styles.areaInfo}>
                  <Text style={[styles.areaName, { color: colors.foreground }]}>{area.name}</Text>
                  <Text style={[styles.areaAddr, { color: colors.mutedForeground }]}>{area.address}</Text>
                  <Text style={[styles.areaContact, { color: colors.mutedForeground }]}>{area.contact_info}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.requestBtn, { backgroundColor: colors.primary }]}
                  onPress={() => requestPartnership(myProfile.id, area.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.requestBtnText}>Request</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null
      }
      ListEmptyComponent={null}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 16 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  sectionSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 12, marginTop: -6 },
  emptyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 12, marginBottom: 4 },
  emptyNoteText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 },
  availableCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, marginBottom: 10 },
  areaIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  areaInfo: { flex: 1 },
  areaName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  areaAddr: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  areaContact: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  requestBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  requestBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
