import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

/**
 * MapModule.js
 * 
 * Provides a platform-agnostic interface for react-native-maps.
 * Provides a rich, premium mock for Safe Mode or Web.
 */

let MapView, Marker, Polyline, PROVIDER_GOOGLE;

/**
 * DEBUG: Force Safe Mode if the app is crashing in production when loading native maps.
 */
const FORCE_SAFE_MODE = true;

if (Platform.OS === 'web' || FORCE_SAFE_MODE) {
  // ── Premium Abstract Mock ──────────────────────────────────────
  MapView = React.forwardRef(({ children, style, initialRegion, region }, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: () => console.log('animateToRegion mocked (Safe Mode)'),
      animateToCoordinate: () => console.log('animateToCoordinate mocked (Safe Mode)'),
      fitToElements: () => console.log('fitToElements mocked (Safe Mode)'),
      fitToCoordinates: () => console.log('fitToCoordinates mocked (Safe Mode)'),
    }));

    return (
      <View 
        style={[
          { 
            backgroundColor: '#0F172A', // Deep Navy
            justifyContent: 'center', 
            alignItems: 'center',
            overflow: 'hidden'
          }, 
          style
        ]}
      >
        {/* Abstract Map Background Pattern */}
        <View style={StyleSheet.absoluteFill}>
            <View style={[styles.gridLine, { top: '20%', width: '100%', height: 1 }]} />
            <View style={[styles.gridLine, { top: '40%', width: '100%', height: 1 }]} />
            <View style={[styles.gridLine, { top: '60%', width: '100%', height: 1 }]} />
            <View style={[styles.gridLine, { top: '80%', width: '100%', height: 1 }]} />
            <View style={[styles.gridLine, { left: '25%', height: '100%', width: 1 }]} />
            <View style={[styles.gridLine, { left: '50%', height: '100%', width: 1 }]} />
            <View style={[styles.gridLine, { left: '75%', height: '100%', width: 1 }]} />
            
            {/* Pulsing Dots Mocking Locations */}
            <View style={[styles.pulseDot, { top: '30%', left: '40%', opacity: 0.3 }]} />
            <View style={[styles.pulseDot, { top: '65%', left: '70%', opacity: 0.2 }]} />
            <View style={[styles.pulseDot, { top: '50%', left: '20%', opacity: 0.4 }]} />
        </View>

        <View style={{ alignItems: 'center', padding: 20, zIndex: 10 }}>
          <View style={styles.lockBadge}>
             <Text style={styles.lockText}>وضع الأمان نشط</Text>
          </View>
          <Text style={{ color: '#F8FAFC', fontWeight: '900', fontSize: 18, marginBottom: 8, textAlign: 'center' }}>
            الخريطة في وضع الصيانة
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', maxWidth: '80%' }}>
            تم تعطيل المكونات البرمجية للخريطة مؤقتاً لضمان ثبات التطبيق.
          </Text>
        </View>
        {children}
      </View>
    );
  });

  Marker = ({ children, coordinate, title, pinColor }) => (
    <View style={{ position: 'absolute', top: '50%', left: '50%', alignItems: 'center' }}>
      <View style={[styles.markerRing, { borderColor: pinColor || '#6366F1' }]} />
      <View style={[styles.markerCore, { backgroundColor: pinColor || '#6366F1' }]} />
      {children}
    </View>
  );
  
  Polyline = () => null;
  PROVIDER_GOOGLE = 'google';

} else {
  // ── Native Implementation ──────────────────────────────────────
  try {
    const MapModule = require('react-native-maps');
    MapView = MapModule.default || MapModule;
    Marker = MapModule.Marker;
    Polyline = MapModule.Polyline;
    PROVIDER_GOOGLE = MapModule.PROVIDER_GOOGLE;

    if (typeof MapView !== 'function' && typeof MapView !== 'object') {
       MapView = View;
    }
    if (typeof Marker !== 'function' && typeof Marker !== 'object') {
       Marker = View;
    }
  } catch (error) {
    console.error('Failed to load react-native-maps:', error);
    MapView = View;
    Marker = View;
    Polyline = View;
    PROVIDER_GOOGLE = 'google';
  }
}

const styles = StyleSheet.create({
    gridLine: { position: 'absolute', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
    pulseDot: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366F1' },
    lockBadge: { backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
    lockText: { color: '#F59E0B', fontSize: 10, fontWeight: '900' },
    markerRing: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, position: 'absolute', opacity: 0.3 },
    markerCore: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF' },
});

export { Marker, Polyline, PROVIDER_GOOGLE };
export default MapView;
