import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { getCheckoutStyles } from './CheckoutStyles';

export default function NewAddressTab({
    newMapRef,
    interactiveMapHtml,
    handleMapMessage,
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
    primaryColor,
    theme
}) {
    const styles = useMemo(() => getCheckoutStyles(theme), [theme]);
    return (
        <View>
            {/* Interactive Map */}
            <View style={styles.mapContainer}>
                <WebView
                    ref={newMapRef}
                    source={{ html: interactiveMapHtml }}
                    style={styles.mapWebView}
                    onMessage={handleMapMessage}
                    nestedScrollEnabled={true}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scrollEnabled={true}
                    overScrollMode="always"
                    scalesPageToFit={false}
                    setBuiltInZoomControls={true}
                    setDisplayZoomControls={false}
                />

                {/* Recenter Button */}
                <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
                    {locatingUser ? (
                        <ActivityIndicator size="small" color={primaryColor} />
                    ) : (
                        <Ionicons name="locate" size={22} color={primaryColor} />
                    )}
                </TouchableOpacity>

                <View style={styles.mapOverlayLabel}>
                    <Ionicons name="finger-print" size={14} color={primaryColor} />
                    <Text style={styles.mapOverlayText}>اضغط لتحديد الموقع</Text>
                </View>
            </View>

            {/* Coordinate Badge */}
            {selectedLocation && (
                <View style={styles.coordBadge}>
                    <Ionicons name="navigate-circle" size={16} color={primaryColor} />
                    <Text style={styles.coordText}>
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
                        placeholderTextColor={theme.textMuted || "#94a3b8"}
                        value={fullName}
                        onChangeText={setFullName}
                    />
                    <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>الموقع التفصيلي <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.standardInput}
                        placeholder="الشارع، الحي، أقرب معلم"
                        placeholderTextColor={theme.textMuted || "#94a3b8"}
                        value={addressLine1}
                        onChangeText={setAddressLine1}
                    />
                    <Ionicons name="location-outline" size={20} color={primaryColor} style={styles.inputIcon} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>الجوال <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.standardInput}
                        placeholder="7XXXXXXXX"
                        placeholderTextColor={theme.textMuted || "#94a3b8"}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <Ionicons name="call-outline" size={20} color="#10b981" style={styles.inputIcon} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ملاحظات الدليفري (اختياري)</Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={[styles.standardInput, styles.textArea]}
                        placeholder="أي تفاصيل أخرى تساعدنا للوصول إليك..."
                        placeholderTextColor={theme.textMuted || "#94a3b8"}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </View>
            </View>
        </View>
    );
}
