import React, { useMemo } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { getCheckoutStyles } from './CheckoutStyles';

export default function SavedAddressTab({ savedAddress, staticMapHtml, savedNotes, setSavedNotes, theme }) {
    const styles = useMemo(() => getCheckoutStyles(theme), [theme]);
    if (!savedAddress) return null;

    return (
        <View>
            {/* Read-Only Map */}
            <View style={styles.mapContainer}>
                <WebView
                    source={{ html: staticMapHtml }}
                    style={styles.mapWebView}
                    scrollEnabled={false}
                    nestedScrollEnabled={false}
                />
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
                        <Text style={styles.savedCardTitle}>عنوان التوصيل</Text>
                        <Text style={styles.savedAddressText} numberOfLines={2}>
                            {savedAddress.city}، {savedAddress.address_line1}
                        </Text>
                    </View>
                </View>
                <View style={styles.savedDetailRow}>
                    <Text style={styles.savedPhoneText}>{savedAddress.phone}</Text>
                    <Ionicons name="call" size={16} color="#94a3b8" />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ملاحظات التوصيل (اختياري)</Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={[styles.standardInput, styles.textArea]}
                        placeholder="اكتب ملاحظاتك لمندوب التوصيل..."
                        placeholderTextColor={theme.textMuted || "#94a3b8"}
                        value={savedNotes}
                        onChangeText={setSavedNotes}
                        multiline
                    />
                </View>
            </View>
        </View>
    );
}
