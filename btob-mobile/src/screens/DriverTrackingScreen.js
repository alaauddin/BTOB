import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Platform, Linking } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '../components/MapModule';
import * as Location from 'expo-location';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import Text from '../components/AppText';
import { BRAND } from '../theme/brand';

const { width, height } = Dimensions.get('window');

export default function DriverMapScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const mapRef = useRef(null);

  /* ── Fetch Order & Route ───────────────────────────────────────── */
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const res = await client.get('/driver/dashboard/');
        if (res.data.success) {
          const found = res.data.orders.find(o => o.id === orderId);
          if (found) {
            setOrder(found);
            const supplier = res.data.driver.supplier;
            calculateRoute(supplier, found.shipping);
          }
        }
      } catch (err) {
        console.error('Fetch order error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [orderId]);

  const calculateRoute = async (supplier, shipping) => {
    if (!supplier || !shipping || !supplier.latitude || !shipping.latitude) return;

    try {
      const resp = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${supplier.longitude},${supplier.latitude};${shipping.longitude},${shipping.latitude}?overview=full&geometries=geojson`
      );
      const data = await resp.json();
      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates.map(c => ({
          latitude: c[1],
          longitude: c[0],
        }));
        setRouteCoords(coords);
      }
    } catch (err) {
      console.warn('OSRM routing failed', err);
      // Fallback: straight dashed line
      setRouteCoords([
        { latitude: parseFloat(supplier.latitude), longitude: parseFloat(supplier.longitude) },
        { latitude: parseFloat(shipping.latitude), longitude: parseFloat(shipping.longitude) }
      ]);
    }
  };

  /* ── Live Location Tracking ────────────────────────────────────── */
  useEffect(() => {
    let subscription;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (loc) => {
          setDriverLocation(loc.coords);
        }
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const centerOnDriver = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...driverLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  const centerOnRoute = () => {
    if (mapRef.current && order?.shipping) {
      mapRef.current.fitToElements(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const shipping = order?.shipping;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: Number.isFinite(parseFloat(shipping?.latitude)) ? parseFloat(shipping.latitude) : 15.1,
          longitude: Number.isFinite(parseFloat(shipping?.longitude)) ? parseFloat(shipping.longitude) : 44.1,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        provider={PROVIDER_GOOGLE}
      >
        {/* Destination Marker */}
        {shipping?.latitude && (
          <Marker
            coordinate={{ 
              latitude: Number.isFinite(parseFloat(shipping?.latitude)) ? parseFloat(shipping?.latitude) : 15.1, 
              longitude: Number.isFinite(parseFloat(shipping?.longitude)) ? parseFloat(shipping?.longitude) : 44.1 
            }}
            title="موقع العميل"
            description={shipping.address_line1}
          >
            <View style={styles.markerContainer}>
              <View style={styles.destinationMarker}>
                <Feather name="home" size={16} color="#FFF" />
              </View>
              <View style={styles.markerArrow} />
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor="#3B82F6"
            lineDashPattern={routeCoords.length === 2 ? [5, 5] : null}
          />
        )}
      </MapView>

      {/* Floating UI overlay */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-right" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>تتبع الطلب #{orderId}</Text>
            <Text style={styles.headerSubtitle}>{order?.customer_name}</Text>
          </View>
        </View>

        <View style={styles.bottomActions}>
          <View style={styles.fabContainer}>
            <TouchableOpacity style={styles.fab} onPress={centerOnDriver}>
              <MaterialIcons name="my-location" size={24} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.fab} onPress={centerOnRoute}>
              <Feather name="maximize" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.statusCard}>
             <View style={styles.statusInfo}>
                <Feather name="navigation" size={20} color="#3B82F6" />
                <View style={styles.statusTextContainer}>
                   <Text style={styles.statusLabel}>المرحلة الحالية</Text>
                   <Text style={styles.statusValue}>{order?.status_name}</Text>
                </View>
             </View>
             
             {shipping?.phone && (
               <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${shipping.phone}`)}
               >
                  <Feather name="phone" size={20} color="#FFF" />
               </TouchableOpacity>
             )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  
  header: { 
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.95)',
    margin: 16,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerContent: { flex: 1, marginRight: 12 },
  headerTitle: { fontSize: 16, fontFamily: BRAND.typography.bold, color: '#1E293B', textAlign: 'auto' },
  headerSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'auto' },

  bottomActions: { position: 'absolute', bottom: 30, left: 16, right: 16 },
  fabContainer: { alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  fab: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },

  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  statusInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  statusTextContainer: { alignItems: 'flex-end' },
  statusLabel: { fontSize: 11, color: '#64748B' },
  statusValue: { fontSize: 15, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  callButton: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center'
  },

  markerContainer: { alignItems: 'center' },
  destinationMarker: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#EF4444',
  }
});
