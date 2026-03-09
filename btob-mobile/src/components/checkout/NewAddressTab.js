import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import styles from './CheckoutStyles';

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
    setNotes
}) {
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
                        <ActivityIndicator size="small" color="#0ea5e9" />
                    ) : (
                        <Ionicons name="locate" size={22} color="#0ea5e9" />
                    )}
                </TouchableOpacity>

                <View style={styles.mapOverlayLabel}>
                    <Ionicons name="finger-print" size={14} color="#0ea5e9" />
                    <Text style={styles.mapOverlayText}>اضغط لتحديد الموقع</Text>
                </View>
            </View>

            {/* Coordinate Badge */}
            {selectedLocation && (
                <View style={styles.coordBadge}>
                    <Ionicons name="navigate-circle" size={16} color="#0ea5e9" />
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
                        placeholderTextColor="#94a3b8"
                        value={fullName}
                        onChangeText={setFullName}
                        textAlign="right"
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
                        placeholderTextColor="#94a3b8"
                        value={addressLine1}
                        onChangeText={setAddressLine1}
                        textAlign="right"
                    />
                    <Ionicons name="location-outline" size={20} color="#0ea5e9" style={styles.inputIcon} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>الجوال <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.standardInput}
                        placeholder="7XXXXXXXX"
                        placeholderTextColor="#94a3b8"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        textAlign="right"
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
                        placeholderTextColor="#94a3b8"
                        value={notes}
                        onChangeText={setNotes}
                        textAlign="right"
                        multiline
                    />
                </View>
            </View>
        </View>
    );
}
