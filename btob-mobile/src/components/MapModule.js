import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

/**
 * MapModule.js
 * 
 * Provides a platform-agnostic interface for react-native-maps.
 * Prevents bundling errors on web by shimming native-only modules.
 */

let MapView, Marker, Polyline, PROVIDER_GOOGLE;

if (Platform.OS === 'web') {
  // ── Web Mocks ───────────────────────────────────────────────────
  MapView = React.forwardRef(({ children, style, initialRegion, region }, ref) => (
    <View 
      ref={ref}
      style={[
        { 
          backgroundColor: '#F1F5F9', 
          justifyContent: 'center', 
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#E2E8F0'
        }, 
        style
      ]}
    >
      <View style={{ alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 16, marginBottom: 4 }}>
          الخريطة غير متوفرة على الويب
        </Text>
        <Text style={{ color: '#CBD5E1', fontSize: 12, textAlign: 'center' }}>
          للحصول على تجربة التتبع الكاملة، يرجى استخدام تطبيق الهاتف.
        </Text>
      </View>
      {children}
    </View>
  ));

  // Add dummy methods for refs
  MapView.prototype.animateToRegion = () => console.log('animateToRegion: Not supported on web');
  MapView.prototype.fitToElements = () => console.log('fitToElements: Not supported on web');
  
  Marker = ({ children, coordinate, title }) => (
    <View style={{ position: 'absolute' }}>
      {children}
    </View>
  );
  
  Polyline = () => null;
  PROVIDER_GOOGLE = 'google';

} else {
  // ── Native Implementation ──────────────────────────────────────
  // Use require to avoid top-level import resolution on web bundling
  const MapModule = require('react-native-maps');
  MapView = MapModule.default;
  Marker = MapModule.Marker;
  Polyline = MapModule.Polyline;
  PROVIDER_GOOGLE = MapModule.PROVIDER_GOOGLE;
}

export { Marker, Polyline, PROVIDER_GOOGLE };
export default MapView;
