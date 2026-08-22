import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { useApp } from '@/context/AppContext';

// Baguio City center, used as the default pin location. Sellers/users
// can still enter a more precise address as text; a full map-picker for
// coordinates is a nice-to-have follow-up, not required to accept
// registrations today.
const BAGUIO_CENTER = { latitude: 16.4023, longitude: 120.596 };

export default function RegisterAreaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { registerDroppingArea } = useApp();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [lateFee, setLateFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Hub name is required'); return; }
    if (!address.trim()) { setError('Address is required'); return; }
    if (!baseFee.trim() || isNaN(parseFloat(baseFee))) { setError('Enter a valid base handling fee'); return; }
    if (!lateFee.trim() || isNaN(parseFloat(lateFee))) { setError('Enter a valid late handling fee'); return; }

    setError('');
    setSaving(true);
    try {
      await registerDroppingArea({
        name: name.trim(),
        address: address.trim(),
        latitude: BAGUIO_CENTER.latitude,
        longitude: BAGUIO_CENTER.longitude,
        contact_info: contactInfo.trim(),
        base_handling_fee: baseFee,
        late_handling_fee: lateFee,
      });
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to register dropping area');
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, padding: 24, justifyContent: 'center' }]}>
        <View style={styles.successBox}>
          <View style={[styles.successIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="check-circle" size={32} color={colors.statusSold} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Submitted for review</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
            Your dropping area has been sent to the platform admin for approval. You'll be
            notified once it's reviewed, and it won't be visible to buyers or sellers until then.
          </Text>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}{required && <Text style={{ color: colors.statusExpired }}> *</Text>}
      </Text>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoBox, { backgroundColor: colors.secondary }]}>
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            New hubs are reviewed by the platform admin before they go live. Sellers can't
            partner with or list items at your hub until it's approved.
          </Text>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.statusExpiredBg }]}>
            <Feather name="alert-circle" size={14} color={colors.statusExpired} />
            <Text style={[styles.errorText, { color: colors.statusExpired }]}>{error}</Text>
          </View>
        ) : null}

        <Field label="Hub Name" required>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g. Session Road Hub"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
          />
        </Field>

        <Field label="Address" required>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Street address, Baguio City"
            placeholderTextColor={colors.mutedForeground}
            value={address}
            onChangeText={setAddress}
          />
        </Field>

        <Field label="Contact Info">
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Phone number or contact person"
            placeholderTextColor={colors.mutedForeground}
            value={contactInfo}
            onChangeText={setContactInfo}
          />
        </Field>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Base Handling Fee (₱)" required>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                value={baseFee}
                onChangeText={setBaseFee}
                keyboardType="decimal-pad"
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Late Fee (₱)" required>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                value={lateFee}
                onChangeText={setLateFee}
                keyboardType="decimal-pad"
              />
            </Field>
          </View>
        </View>
        <Text style={[styles.feeNote, { color: colors.mutedForeground }]}>
          Every item dropped at this hub will be charged this exact fee — sellers won't be able
          to set their own.
        </Text>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="map-pin" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Submit for Review</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: 'Inter_400Regular' },
  row: { flexDirection: 'row', gap: 10 },
  feeNote: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: -6, marginBottom: 16, lineHeight: 15 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  successBox: { alignItems: 'center', gap: 12 },
  successIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  successSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
});
