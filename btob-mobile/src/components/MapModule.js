import React, { useImperativeHandle, forwardRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { 
  Map, 
  Camera, 
  UserLocation, 
  GeoJSONSource, 
  Layer, 
  ViewAnnotation 
} from '@maplibre/maplibre-react-native';

// Using a high-quality free open-source style from OpenFreeMap
const DEFAULT_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const MapView = forwardRef(({ children, style, initialRegion, region, showsUserLocation, onPress }, ref) => {
  const cameraRef = React.useRef(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (reg, duration = 1000) => {
      if (cameraRef.current) {
        cameraRef.current.easeTo({
          center: [reg.longitude, reg.latitude],
          zoom: 12,
          duration: duration,
        });
      }
    },
    fitToElements: (animated) => {
      console.log('fitToElements called (MapLibre implementation)');
    },
    animateToCoordinate: (coord, duration = 1000) => {
      cameraRef.current?.easeTo({
        center: [coord.longitude, coord.latitude],
        duration: duration,
      });
    }
  }));

  // Sync camera with region prop (controlled mode)
  useEffect(() => {
    if (region && cameraRef.current) {
      cameraRef.current.easeTo({
        center: [region.longitude, region.latitude],
        zoom: 12,
        duration: 500,
      });
    }
  }, [region?.latitude, region?.longitude]);

  const handlePress = (event) => {
    if (onPress) {
      const { nativeEvent: { lngLat } } = event;
      if (lngLat) {
        onPress({
          nativeEvent: {
            coordinate: {
              latitude: lngLat[1],
              longitude: lngLat[0],
            }
          }
        });
      }
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Map
        style={styles.map}
        mapStyle={DEFAULT_STYLE}
        logo={false}
        attribution={true}
        onPress={handlePress}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [
              region?.longitude || initialRegion?.longitude || 44.1, 
              region?.latitude || initialRegion?.latitude || 15.1
            ],
            zoom: (region?.latitudeDelta || initialRegion?.latitudeDelta) ? 10 : 12,
          }}
        />
        {showsUserLocation && <UserLocation />}
        {children}
      </Map>
    </View>
  );
});

const Marker = ({ coordinate, title, pinColor, draggable, onDragEnd, children }) => (
  <ViewAnnotation
    id="selected-location-marker"
    lngLat={[coordinate.longitude, coordinate.latitude]}
    title={title}
    draggable={draggable}
    onDragEnd={onDragEnd ? (e) => {
      const { nativeEvent: { lngLat } } = e;
      if (lngLat) {
        onDragEnd({
          nativeEvent: {
            coordinate: {
              latitude: lngLat[1],
              longitude: lngLat[0],
            }
          }
        });
      }
    } : undefined}
  >

    {children || (
      <View style={styles.defaultMarkerContainer}>
        <View style={[styles.defaultMarker, { backgroundColor: pinColor || '#EF4444' }]} />
      </View>
    )}
  </ViewAnnotation>
);

const Polyline = ({ coordinates, strokeColor, strokeWidth }) => (
  <GeoJSONSource
    id="polyline-source"
    data={{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coordinates.map(c => [c.longitude, c.latitude]),
      },
    }}
  >
    <Layer
      id="polyline-layer"
      type="line"
      paint={{
        'line-color': strokeColor || '#3B82F6',
        'line-width': strokeWidth || 3,
        'line-cap': 'round',
        'line-join': 'round',
      }}
    />
  </GeoJSONSource>
);

const PROVIDER_GOOGLE = 'google';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  map: { flex: 1 },
  defaultMarkerContainer: {
    padding: 5,
  },
  defaultMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});

export { Marker, Polyline, PROVIDER_GOOGLE };
export default MapView;

