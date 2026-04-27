import React, { useMemo } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from "@expo/vector-icons";
import MapView, { Marker } from '../MapModule';
import { getCheckoutStyles } from './CheckoutStyles';
import Text from '../AppText';
import TextInput from '../AppTextInput';

export default function NewAddressTab({
    mapRef,
    handleLocationSelect,
    handleRecenter,
    locatingUser,
    selectedLocation,
    fullName,
    setFullName,
    addressLine1,
    setAddressLine1,
    phone,
    setPhone,
    notes,
    setNotes,
    setScrollEnabled,
    primaryColor,
    theme
}) {
    const styles = useMemo(() => getCheckoutStyles(theme), [theme]);
    
    const initialRegion = useMemo(() => ({
        latitude: selectedLocation?.latitude || 15.3694,
        longitude: selectedLocation?.longitude || 44.191,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    }), []);

    return (
        <View>
            {/* Interactive Map */}
            <View 
                style={styles.mapContainer}
                onTouchStart={() => setScrollEnabled(false)}
                onTouchEnd={() => setScrollEnabled(true)}
                onTouchCancel={() => setScrollEnabled(true)}
            >
                <MapView
                    ref={mapRef}
                    style={styles.mapWebView}
                    initialRegion={initialRegion}
                    onPress={(e) => handleLocationSelect(e.nativeEvent.coordinate)}
                >
                    <Marker 
                        coordinate={{ 
                            latitude: selectedLocation?.latitude || 15.3694, 
                            longitude: selectedLocation?.longitude || 44.191 
                        }} 
                        pinColor={primaryColor}
                    />
                </MapView>

                {/* Recenter Button */}
                <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter} activeOpacity={0.8}>
                    {locatingUser ? (
                        <ActivityIndicator size="small" color={primaryColor} />
                    ) : (
                        <Ionicons name="locate" size={24} color={primaryColor} />
                    )}
                </TouchableOpacity>

                <View style={styles.mapOverlayLabel}>
                    <Ionicons name="finger-print" size={14} color={primaryColor} />
                    <Text style={styles.mapOverlayText}>انقر على الخريطة لتحديد الموقع</Text>
                </View>
            </View>

            {/* Coordinate Badge */}
            {selectedLocation && (
                <View style={[styles.coordBadge, { backgroundColor: primaryColor + '08', marginBottom: 20 }]}>
                    <Ionicons name="navigate-circle" size={16} color={primaryColor} />
                    <Text style={[styles.coordText, { color: primaryColor }]}>
                        {"\u200E"}{selectedLocation.latitude.toFixed(5)}{", "}{selectedLocation.longitude.toFixed(5)}{"\u200E"}
                    </Text>
                </View>
            )}

            {/* Form Fields */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>اسم المستلم (اختياري)</Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.standardInput}
                        placeholder="أدخل الاسم"
                        placeholderTextColor="#94A3B8"
                        value={fullName}
                        onChangeText={setFullName}
                    />
                    <View style={styles.inputIcon}>
                        <Feather name="user" size={20} color="#94A3B8" />
                    </View>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>الموقع التفصيلي <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.inputWrapper, { borderColor: primaryColor + '20' }]}>
                    <TextInput
                        style={styles.standardInput}
                        placeholder="الشارع، الحي، أقرب معلم"
                        placeholderTextColor="#94A3B8"
                        value={addressLine1}
                        onChangeText={setAddressLine1}
                    />
                    <View style={styles.inputIcon}>
                        <Ionicons name="location-outline" size={20} color={primaryColor} />
                    </View>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>رقم الجوال <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.standardInput}
                        placeholder="7XXXXXXXX"
                        placeholderTextColor="#94A3B8"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <View style={styles.inputIcon}>
                        <Feather name="phone" size={20} color="#10B981" />
                    </View>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ملاحظات إضافية (اختياري)</Text>
                <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingVertical: 8 }]}>
                    <TextInput
                        style={[styles.standardInput, { height: '100%' }]}
                        placeholder="أي تفاصيل أخرى تساعدنا للوصول إليك..."
                        placeholderTextColor="#94A3B8"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </View>
            </View>
        </View>
    );
}
