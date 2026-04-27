import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from '../MapModule';
import { getCheckoutStyles } from './CheckoutStyles';
import Text from '../AppText';
import TextInput from '../AppTextInput';

export default function SavedAddressTab({ savedAddress, savedLatLng, savedNotes, setSavedNotes, setScrollEnabled, theme }) {
    const styles = useMemo(() => getCheckoutStyles(theme), [theme]);
    if (!savedAddress) return null;

    return (
        <View>
            {/* Read-Only Map */}
            <View 
                style={styles.mapContainer}
                onTouchStart={() => setScrollEnabled(false)}
                onTouchEnd={() => setScrollEnabled(true)}
                onTouchCancel={() => setScrollEnabled(true)}
            >
                <MapView
                    style={styles.mapWebView}
                    initialRegion={{
                        latitude: savedLatLng?.latitude || 15.3694,
                        longitude: savedLatLng?.longitude || 44.191,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                >
                    <Marker 
                        coordinate={{ 
                            latitude: savedLatLng?.latitude || 15.3694, 
                            longitude: savedLatLng?.longitude || 44.191 
                        }} 
                        pinColor={theme.primary}
                    />
                </MapView>
                <View style={styles.mapOverlayLabel}>
                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                    <Text style={styles.mapOverlayText}>الموقع المحفوظ</Text>
                </View>
            </View>

            {/* Address Card */}
            <View style={styles.savedCard}>
                <View style={styles.savedCardHeader}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="home" size={24} color={theme.primary || "#0ea5e9"} />
                    </View>
                    <View style={styles.savedTextColumn}>
                        <Text style={styles.savedCardTitle}>عنوان التوصيل المختار</Text>
                        <Text style={styles.savedAddressText} numberOfLines={2}>
                            {savedAddress.city}، {savedAddress.address_line1}
                        </Text>
                    </View>
                </View>
                <View style={styles.savedDetailRow}>
                    <Ionicons name="call-outline" size={18} color="#94A3B8" />
                    <Text style={styles.savedPhoneText}>{savedAddress.phone}</Text>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ملاحظات إضافية للمندوب</Text>
                <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingVertical: 8 }]}>
                    <TextInput
                        style={[styles.standardInput, { height: '100%' }]}
                        placeholder="أدخل أي ملاحظات تساعد المندوب في الوصول إليك..."
                        placeholderTextColor="#94A3B8"
                        value={savedNotes}
                        onChangeText={setSavedNotes}
                        multiline
                    />
                </View>
            </View>
        </View>
    );
}
