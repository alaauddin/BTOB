import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { getCheckoutStyles } from './CheckoutStyles';
import Text from '../AppText';

export default function TabHeader({ activeTab, setActiveTab, setFormError, setUserTabInteracted, savedAddress, requestCurrentLocation, primaryColor, theme }) {
    const styles = useMemo(() => getCheckoutStyles(theme), [theme]);
    return (
        <View style={styles.tabsWrapper}>
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.tabButton, activeTab === "saved" && styles.activeTabButton]}
                    onPress={() => {
                        if (savedAddress) {
                            setActiveTab("saved");
                            setFormError("");
                            setUserTabInteracted(true);
                        }
                    }}
                    disabled={!savedAddress}
                >
                    <Ionicons 
                        name="bookmark" 
                        size={18} 
                        color={activeTab === "saved" ? primaryColor : "#94A3B8"} 
                    />
                    <Text style={[styles.tabText, activeTab === "saved" && styles.activeTabText]}>
                        المواقع المحفوظة
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.tabButton, activeTab === "new" && styles.activeTabButton]}
                    onPress={() => {
                        setActiveTab("new");
                        setFormError("");
                        setUserTabInteracted(true);
                        requestCurrentLocation();
                    }}
                >
                    <Ionicons 
                        name="add-circle" 
                        size={20} 
                        color={activeTab === "new" ? primaryColor : "#94A3B8"} 
                    />
                    <Text style={[styles.tabText, activeTab === "new" && styles.activeTabText]}>
                        موقع جديد
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
