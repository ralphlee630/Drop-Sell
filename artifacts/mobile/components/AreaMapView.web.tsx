// Web stub – react-native-maps is not supported on web
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { DroppingArea } from '@/lib/types';

interface Props {
  areas: DroppingArea[];
  primaryColor: string;
}

export default function AreaMapView({ areas, primaryColor }: Props) {
  return (
    <View style={[styles.root, { backgroundColor: '#f0f4f8' }]}>
      <Feather name="map" size={48} color={primaryColor} style={{ opacity: 0.5 }} />
      <Text style={[styles.title, { color: primaryColor }]}>Map View</Text>
      <Text style={styles.sub}>Interactive map is available on the mobile app.</Text>
      <Text style={styles.count}>{areas.length} hubs in Baguio City</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  sub: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  count: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
});
