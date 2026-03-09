import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import styles from './CheckoutStyles';

const DEFAULT_LAT = 15.3694;
const DEFAULT_LNG = 44.191;

export default function TabHeader({ activeTab, setActiveTab, setFormError, setUserTabInteracted, savedAddress, selectedLocation, requestCurrentLocation }) {
    return (
        <View style={styles.tabsWrapper}>
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === "new" && styles.activeTabButton]}
                    onPress={() => {
                        setActiveTab("new");
                        setFormError("");
                        setUserTabInteracted(true);
                        if (selectedLocation.latitude === DEFAULT_LAT && selectedLocation.longitude === DEFAULT_LNG) {
                            requestCurrentLocation();
                        }
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="location" size={20} color={activeTab === "new" ? "#0ea5e9" : "#64748b"} />
                    <Text style={[styles.tabText, activeTab === "new" && styles.activeTabText]}>عنوان جديد</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === "saved" && styles.activeTabButton, !savedAddress && { opacity: 0.6 }]}
                    onPress={() => {
                        if (!savedAddress) {
                            setFormError("ليس لديك عنوان محفوظ حالياً. يرجى إضافة عنوان جديد.");
                            return;
                        }
                        setActiveTab("saved");
                        setFormError("");
                        setUserTabInteracted(true);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="home" size={20} color={activeTab === "saved" ? "#0ea5e9" : "#64748b"} />
                    <Text style={[styles.tabText, activeTab === "saved" && styles.activeTabText]}>العنوان المحفوظ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
