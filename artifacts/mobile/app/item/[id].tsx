import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { FeeBreakdown } from '@/components/FeeBreakdown';
import { EmptyState } from '@/components/EmptyState';
import { formatDeadlineCountdown, formatPeso, timeAgo, snapshotFeeAtPurchase } from '@/lib/feeCalculations';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, isAuthenticated } = useAuth();
  const { items, getAreaById, getSellerById, purchaseItem } = useApp();

  const [purchasing, setPurchasing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseDone, setPurchaseDone] = useState(false);

  const item = items.find((i) => i.id === id);
  const area = item ? getAreaById(item.dropping_area_id) : undefined;
  const seller = item ? getSellerById(item.seller_id) : undefined;

  if (!item) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <EmptyState icon="package" title="Item not found" />
      </View>
    );
  }

  const { label: deadlineLabel, isOverdue, isUrgent } = formatDeadlineCountdown(item.deadline_at);
  const deadlineColor = isOverdue ? colors.statusExpired : isUrgent ? colors.partnerPending : colors.mutedForeground;
  const canPurchase = item.status === 'dropped' && !purchaseDone;
  const fee = snapshotFeeAtPurchase(item);
  const total = item.amount + fee;

  const handlePurchase = async () => {
    if (!isAuthenticated) { router.push('/(auth)/login'); return; }
    setPurchaseError('');
    setPurchasing(true);
    try {
      await purchaseItem(item.id);
      setShowConfirm(false);
      setPurchaseDone(true);
    } catch (e: unknown) {
      setPurchaseError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo */}
        <View style={[styles.photoArea, { backgroundColor: colors.muted }]}>
          <Feather name="image" size={48} color={colors.mutedForeground} />
          <Text style={[styles.noPhotoText, { color: colors.mutedForeground }]}>No photo provided</Text>
        </View>

        <View style={styles.content}>
          {/* Status + title */}
          <View style={styles.titleRow}>
            <StatusBadge status={item.status} />
            {item.buyer_name && (
              <View style={[styles.reservedBadge, { backgroundColor: colors.secondary }]}>
                <Feather name="user" size={12} color={colors.primary} />
                <Text style={[styles.reservedText, { color: colors.primary }]}>Reserved</Text>
              </View>
            )}
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
          <Text style={[styles.code, { color: colors.mutedForeground }]}>
            Product Code: {item.product_code}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.foreground }]}>{item.description}</Text>

          {/* Seller + area */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {seller && (
              <View style={styles.infoRow}>
                <Feather name="briefcase" size={15} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Seller</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{seller.business_name}</Text>
                </View>
              </View>
            )}
            {area && (
              <View style={[styles.infoRow, { borderTopWidth: seller ? 1 : 0, borderTopColor: colors.border }]}>
                <Feather name="map-pin" size={15} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Drop-off Hub</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{area.name}</Text>
                  <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>{area.address}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Timing info */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Feather name="clock" size={15} color={deadlineColor} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Deadline</Text>
                <Text style={[styles.infoValue, { color: deadlineColor }]}>{deadlineLabel}</Text>
                <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>
                  {new Date(item.deadline_at).toLocaleDateString('en-PH', {
                    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            {item.dropped_at && (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Feather name="check-circle" size={15} color={colors.statusDropped} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Dropped at hub</Text>
                  <Text style={[styles.infoValue, { color: colors.statusDropped }]}>
                    {timeAgo(item.dropped_at)}
                  </Text>
                </View>
              </View>
            )}
            {!item.dropped_at && (
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Feather name="alert-circle" size={15} color={colors.mutedForeground} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Drop status</Text>
                  <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>Not yet at hub</Text>
                </View>
              </View>
            )}
          </View>

          {/* Fee breakdown */}
          <FeeBreakdown item={item} />

          {purchaseDone && (
            <View style={[styles.successBanner, { backgroundColor: colors.statusSoldBg }]}>
              <Feather name="check-circle" size={18} color={colors.statusSold} />
              <Text style={[styles.successText, { color: colors.statusSold }]}>
                Purchase confirmed! Head to {area?.name} to pick up your item.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA footer */}
      {canPurchase && !purchaseDone && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.footerTotal}>
            <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Total</Text>
            <Text style={[styles.footerAmount, { color: colors.primary }]}>{formatPeso(total)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.purchaseBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (!isAuthenticated) { router.push('/(auth)/login'); return; }
              setShowConfirm(true);
            }}
            activeOpacity={0.85}
          >
            <Feather name="shopping-bag" size={18} color="#fff" />
            <Text style={styles.purchaseBtnText}>Reserve & Purchase</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'sold' && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.soldBanner, { backgroundColor: colors.statusSoldBg }]}>
            <Feather name="check-circle" size={16} color={colors.statusSold} />
            <Text style={[styles.soldText, { color: colors.statusSold }]}>This item has been sold</Text>
          </View>
        </View>
      )}

      {/* Purchase confirmation modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Confirm Purchase</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              You are purchasing:
            </Text>
            <Text style={[styles.modalItemName, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.modalCode, { color: colors.mutedForeground }]}>{item.product_code}</Text>

            <View style={[styles.modalBreakdown, { backgroundColor: colors.background }]}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalRowLabel, { color: colors.mutedForeground }]}>Item price</Text>
                <Text style={[styles.modalRowValue, { color: colors.foreground }]}>{formatPeso(item.amount)}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalRowLabel, { color: colors.mutedForeground }]}>Handling fee</Text>
                <Text style={[styles.modalRowValue, { color: colors.foreground }]}>{formatPeso(fee)}</Text>
              </View>
              <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />
              <View style={styles.modalRow}>
                <Text style={[styles.modalRowLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Total</Text>
                <Text style={[styles.modalRowValue, { color: colors.primary, fontSize: 18, fontFamily: 'Inter_700Bold' }]}>{formatPeso(total)}</Text>
              </View>
            </View>

            <Text style={[styles.modalNote, { color: colors.mutedForeground }]}>
              Pick up at {area?.name} · {area?.address}
            </Text>

            {purchaseError ? (
              <Text style={[styles.modalError, { color: colors.statusExpired }]}>{purchaseError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }, purchasing && { opacity: 0.6 }]}
              onPress={handlePurchase}
              disabled={purchasing}
              activeOpacity={0.85}
            >
              {purchasing ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.confirmBtnText}>Confirm Purchase — {formatPeso(total)}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirm(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  photoArea: { height: 240, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noPhotoText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  content: { padding: 16, gap: 14 },
  titleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', lineHeight: 28 },
  code: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  description: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  reservedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  reservedText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  infoCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  infoSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  successBanner: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  successText: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1, lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerTotal: { flex: 1 },
  footerLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  footerAmount: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  purchaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  purchaseBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  soldBanner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12 },
  soldText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  modalItemName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  modalCode: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  modalBreakdown: { borderRadius: 12, padding: 14, gap: 8, marginBottom: 12 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalRowLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  modalRowValue: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  modalDivider: { height: 1, marginVertical: 4 },
  modalNote: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 16 },
  modalError: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 8 },
  confirmBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
