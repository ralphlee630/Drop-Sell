// Native implementation – uses react-native-maps
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { router } from 'expo-router';
import type { DroppingArea } from '@/lib/types';

interface Props {
  areas: DroppingArea[];
  primaryColor: string;
}

const BAGUIO_CENTER = { latitude: 16.4118, longitude: 120.5960 };

export default function AreaMapView({ areas, primaryColor }: Props) {
  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={{ ...BAGUIO_CENTER, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
      showsUserLocation
    >
      {areas.map((area) => (
        <Marker
          key={area.id}
          coordinate={{ latitude: area.latitude, longitude: area.longitude }}
          pinColor={primaryColor}
          title={area.name}
          description={area.address}
        >
          <Callout onPress={() => router.push(`/area/${area.id}`)}>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{area.name}</Text>
              <Text style={styles.calloutAddr}>{area.address}</Text>
              <Text style={styles.calloutTap}>Tap to view items →</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  callout: { width: 200, padding: 4 },
  calloutTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  calloutAddr: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  calloutTap: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
});
