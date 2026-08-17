import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { persistPhoto, deletePhoto } from '@/lib/photoStorage';

function generateProductCode(): string {
  const suffix = Date.now().toString().slice(-4);
  return `DSP-${suffix}`;
}

export default function NewItemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { createItem, getSellerForCurrentUser, getApprovedAreasForSeller } = useApp();

  const myProfile = getSellerForCurrentUser();
  const approvedAreas = myProfile ? getApprovedAreasForSeller(myProfile.id) : [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productCode, setProductCode] = useState(generateProductCode());
  const [buyerName, setBuyerName] = useState('');
  const [amount, setAmount] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [lateFee, setLateFee] = useState('');
  const [areaId, setAreaId] = useState(approvedAreas[0]?.id ?? '');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [deadlineText, setDeadlineText] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1, // we compress ourselves via expo-image-manipulator
    });
    if (result.canceled) return;

    setPhotoProcessing(true);
    try {
      // Delete previous photo if one was already selected
      if (photoUri) await deletePhoto(photoUri);

      const persisted = await persistPhoto(result.assets[0].uri);
      if (persisted) setPhotoUri(persisted.uri);
    } catch {
      Alert.alert('Photo error', 'Could not process the selected photo. Please try another.');
    } finally {
      setPhotoProcessing(false);
    }
  };

  const removePhoto = async () => {
    if (photoUri) await deletePhoto(photoUri);
    setPhotoUri(undefined);
  };

  const handleDeadlineChange = (text: string) => {
    setDeadlineText(text);
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) setDeadline(parsed);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!amount.trim() || isNaN(parseFloat(amount))) { setError('Enter a valid amount'); return; }
    if (!baseFee.trim() || isNaN(parseFloat(baseFee))) { setError('Enter a valid base handling fee'); return; }
    if (!lateFee.trim() || isNaN(parseFloat(lateFee))) { setError('Enter a valid late handling fee'); return; }
    if (!areaId) { setError('Select a dropping area'); return; }
    if (isNaN(deadline.getTime())) { setError('Enter a valid deadline date (YYYY-MM-DD)'); return; }

    setError('');
    setSaving(true);
    try {
      await createItem({
        title: title.trim(),
        description: description.trim(),
        product_code: productCode.trim(),
        buyer_name: buyerName.trim(),
        amount,
        base_handling_fee: baseFee,
        late_handling_fee: lateFee,
        deadline_at: deadline,
        dropping_area_id: areaId,
      }, photoUri);
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  if (!myProfile) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={[styles.errorMsg, { color: colors.statusExpired }]}>
          You need a seller profile to list items.
        </Text>
      </View>
    );
  }

  if (approvedAreas.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: 'center', padding: 24 }]}>
        <View style={styles.noAreaBox}>
          <Feather name="link" size={36} color={colors.mutedForeground} />
          <Text style={[styles.noAreaTitle, { color: colors.foreground }]}>No approved partnerships</Text>
          <Text style={[styles.noAreaSub, { color: colors.mutedForeground }]}>
            You need an approved partnership with a dropping area before you can list items there.
          </Text>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/sell/partnerships')}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Request Partnership</Text>
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
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.statusExpiredBg }]}>
            <Feather name="alert-circle" size={14} color={colors.statusExpired} />
            <Text style={[styles.errorText, { color: colors.statusExpired }]}>{error}</Text>
          </View>
        ) : null}

        {/* Photo picker */}
        <View style={styles.photoSection}>
          {photoUri ? (
            /* Photo selected — show preview with remove button */
            <View style={[styles.photoPreviewWrap, { borderColor: colors.border }]}>
              <Image
                source={{ uri: photoUri }}
                style={styles.photoPreview}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={[styles.photoActionBtn, { backgroundColor: colors.card }]}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <Feather name="refresh-cw" size={14} color={colors.foreground} />
                  <Text style={[styles.photoActionText, { color: colors.foreground }]}>Replace</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoActionBtn, { backgroundColor: colors.statusExpiredBg }]}
                  onPress={removePhoto}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={14} color={colors.statusExpired} />
                  <Text style={[styles.photoActionText, { color: colors.statusExpired }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* No photo — show picker tap target */
            <TouchableOpacity
              style={[styles.photoPicker, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={pickImage}
              disabled={photoProcessing}
              activeOpacity={0.8}
            >
              {photoProcessing ? (
                <>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.photoLabel, { color: colors.mutedForeground }]}>Processing…</Text>
                </>
              ) : (
                <>
                  <View style={[styles.cameraCircle, { backgroundColor: colors.secondary }]}>
                    <Feather name="camera" size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.photoLabel, { color: colors.foreground }]}>Add item photo</Text>
                  <Text style={[styles.photoSub, { color: colors.mutedForeground }]}>
                    Tap to choose from your camera roll
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Field label="Item Title" required>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g. Vintage Denim Jacket"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        <Field label="Description">
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Describe the item's condition and details…"
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </Field>

        <Field label="Product Code" required>
          <View style={styles.codeRow}>
            <TextInput
              style={[styles.input, styles.codeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={productCode}
              onChangeText={setProductCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.regenBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setProductCode(generateProductCode())}
            >
              <Feather name="refresh-cw" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Field>

        <Field label="Buyer Name (optional)">
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Pre-assign to a specific buyer"
            placeholderTextColor={colors.mutedForeground}
            value={buyerName}
            onChangeText={setBuyerName}
          />
        </Field>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Sale Amount (₱)" required>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </Field>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Base Fee (₱)" required>
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

        <Field label="Pickup Deadline (YYYY-MM-DD)" required>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="2025-12-31"
            placeholderTextColor={colors.mutedForeground}
            value={deadlineText}
            onChangeText={handleDeadlineChange}
          />
        </Field>

        <Field label="Dropping Area" required>
          {approvedAreas.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.areaOption,
                {
                  backgroundColor: areaId === a.id ? colors.secondary : colors.card,
                  borderColor: areaId === a.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setAreaId(a.id)}
              activeOpacity={0.8}
            >
              <Feather
                name={areaId === a.id ? 'check-circle' : 'circle'}
                size={16}
                color={areaId === a.id ? colors.primary : colors.mutedForeground}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.areaName, { color: colors.foreground }]}>{a.name}</Text>
                <Text style={[styles.areaAddr, { color: colors.mutedForeground }]}>{a.address}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </Field>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving || photoProcessing}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="package" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>List Item for Drop-off</Text>
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
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  errorMsg: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  photoSection: { marginBottom: 16 },
  photoPicker: {
    height: 160, borderRadius: 14, borderWidth: 1.5,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  cameraCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  photoLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  photoSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  photoPreviewWrap: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  photoPreview: { width: '100%', height: 200 },
  photoActions: { flexDirection: 'row', gap: 8, padding: 10 },
  photoActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  photoActionText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: 'Inter_400Regular' },
  textArea: { height: 90, textAlignVertical: 'top' },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeInput: { flex: 1 },
  regenBtn: { borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  areaOption: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  areaName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  areaAddr: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  noAreaBox: { alignItems: 'center', gap: 12 },
  noAreaTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  noAreaSub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
});
