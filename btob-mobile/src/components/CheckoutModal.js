import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ActivityIndicator,
    Linking,
    Alert,
    ScrollView,
    Animated,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import apiClient from "../api/client";

// Modular Sub-components
import styles from './checkout/CheckoutStyles';
import { getMapHtml } from './checkout/MapHelper';
import TabHeader from './checkout/TabHeader';
import SavedAddressTab from './checkout/SavedAddressTab';
import NewAddressTab from './checkout/NewAddressTab';

// Default to Sana'a, Yemen
const DEFAULT_LAT = 15.3694;
const DEFAULT_LNG = 44.191;

export default function CheckoutModal({ visible, onClose, cart, supplierId, onSuccess }) {
    const [activeTab, setActiveTab] = useState("saved");
    const [loading, setLoading] = useState(false);
    const [fetchingAddress, setFetchingAddress] = useState(true);
    const [savedAddress, setSavedAddress] = useState(null);

    // Form State
    const [fullName, setFullName] = useState("");
    const [addressLine1, setAddressLine1] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");
    const [savedNotes, setSavedNotes] = useState("");
    const [userTabInteracted, setUserTabInteracted] = useState(false);

    // Map State
    const [selectedLocation, setSelectedLocation] = useState({
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
    });
    const [savedLatLng, setSavedLatLng] = useState(null);
    const [locatingUser, setLocatingUser] = useState(false);
    const [formError, setFormError] = useState("");

    // Animations
    const slideAnimation = useRef(new Animated.Value(0)).current;
    const fadeAnimation = useRef(new Animated.Value(0)).current;
    const newMapRef = useRef(null);

    // Memoized Map HTML
    const interactiveMapHtml = useMemo(() => {
        return getMapHtml(selectedLocation?.latitude || DEFAULT_LAT, selectedLocation?.longitude || DEFAULT_LNG, true);
    }, [visible, activeTab === 'new', selectedLocation]);

    const staticMapHtml = useMemo(() => {
        return getMapHtml(savedLatLng?.latitude || DEFAULT_LAT, savedLatLng?.longitude || DEFAULT_LNG, false);
    }, [visible, activeTab === 'saved', savedLatLng]);

    useEffect(() => {
        if (visible) {
            setUserTabInteracted(false);
            Animated.parallel([
                Animated.timing(slideAnimation, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.timing(fadeAnimation, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
            if (supplierId) fetchSavedAddress();
        } else {
            slideAnimation.setValue(0);
            fadeAnimation.setValue(0);
            setTimeout(() => { setFormError(""); }, 300);
        }
    }, [visible, supplierId]);

    const fetchSavedAddress = async () => {
        setFetchingAddress(true);
        try {
            const response = await apiClient.get('/carts/get_saved_address/');
            if (response.data.success && response.data.address) {
                const addr = response.data.address;
                setSavedAddress(addr);
                setAddressLine1(addr.address_line1 || "");
                setPhone(addr.phone ? String(addr.phone) : "");
                setNotes(addr.address_line2 || "");

                setUserTabInteracted(prev => {
                    if (!prev) setActiveTab("saved");
                    return prev;
                });

                if (addr.latitude && addr.longitude) {
                    setSavedLatLng({
                        latitude: parseFloat(addr.latitude),
                        longitude: parseFloat(addr.longitude),
                    });
                }
            } else {
                setUserTabInteracted(prev => {
                    if (!prev) { setActiveTab("new"); requestCurrentLocation(); }
                    return prev;
                });
            }
        } catch (error) {
            setUserTabInteracted(prev => {
                if (!prev) { setActiveTab("new"); requestCurrentLocation(); }
                return prev;
            });
        } finally {
            setFetchingAddress(false);
        }
    };

    const requestCurrentLocation = async () => {
        setLocatingUser(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                setSelectedLocation(coord);
                newMapRef.current?.injectJavaScript(`window.updateMarker(${coord.latitude}, ${coord.longitude}); true;`);
            }
        } catch (err) {
            console.log("Location error:", err);
        } finally {
            setLocatingUser(false);
        }
    };

    const handleRecenter = async () => {
        setLocatingUser(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                setSelectedLocation(coord);
                newMapRef.current?.injectJavaScript(`window.updateMarker(${coord.latitude}, ${coord.longitude}); true;`);
            }
        } catch (err) {
            console.log("Recenter error:", err);
        } finally {
            setLocatingUser(false);
        }
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`);
            const data = await response.json();
            if (data) {
                const parts = [];
                let localPoi = "";
                if (data.localityInfo && data.localityInfo.informal && data.localityInfo.informal.length > 0) {
                    localPoi = data.localityInfo.informal[0].name;
                }
                if (localPoi) parts.push(localPoi);
                else if (data.locality) parts.push(data.locality);
                if (data.city && data.city !== data.locality && data.city !== localPoi) parts.push(data.city);
                if (data.principalSubdivision) parts.push(data.principalSubdivision);

                let addr = parts.join('، ');
                if (addr) {
                    setAddressLine1(addr);
                    const gMapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                    const linkText = `📍 رابط الموقع: ${gMapsLink}`;
                    if (!notes.includes("google.com/maps")) {
                        setNotes(prev => prev ? `${prev}\n\n${linkText}` : linkText);
                    } else {
                        setNotes(prev => prev.replace(/📍 رابط الموقع: https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=[0-9.-]+,[0-9.-]+/g, linkText));
                    }
                }
            }
        } catch (error) {
            console.log("Reverse geocode error:", error);
        }
    };

    const handleMapMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "location") {
                setSelectedLocation({ latitude: data.latitude, longitude: data.longitude });
                reverseGeocode(data.latitude, data.longitude);
            }
        } catch (err) { }
    };

    const handleCheckoutWithSaved = async () => {
        setFormError("");
        setLoading(true);
        try {
            const response = await apiClient.post('/carts/checkout_registered_address/', {
                supplier_id: supplierId,
                address_line2: savedNotes,
            });
            if (response.data.success && response.data.wa_url) {
                Linking.openURL(response.data.wa_url).catch(() => Alert.alert("عذراً", "حدث خطأ في فتح واتساب"));
                onClose();
                if (onSuccess) onSuccess();
            } else {
                setFormError(response.data.message || "حدث خطأ أثناء الطلب");
            }
        } catch (error) {
            setFormError(error.response?.data?.message || "فشل الاتصال بالخادم");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckoutWithNew = async () => {
        setFormError("");
        if (!addressLine1.trim()) { setFormError("يرجى إدخال الموقع (العنوان)"); return; }
        if (!phone.trim()) { setFormError("يرجى إدخال رقم الهاتف"); return; }
        setLoading(true);
        try {
            const response = await apiClient.post('/carts/checkout_custom_address/', {
                supplier_id: supplierId,
                full_name: fullName,
                address_line1: addressLine1,
                phone: phone,
                address_line2: notes,
                latitude: selectedLocation?.latitude || null,
                longitude: selectedLocation?.longitude || null,
            });
            if (response.data.success && response.data.wa_url) {
                Linking.openURL(response.data.wa_url).catch(() => Alert.alert("عذراً", "حدث خطأ في فتح واتساب"));
                onClose();
                if (onSuccess) onSuccess();
            } else {
                setFormError(response.data.message || "حدث خطأ أثناء الطلب");
            }
        } catch (error) {
            setFormError(error.response?.data?.message || "فشل الاتصال بالخادم");
        } finally {
            setLoading(false);
        }
    };

    const translateY = slideAnimation.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={[styles.overlay]}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]} />
                </TouchableWithoutFeedback>

                <Animated.View style={[{ flex: 1, justifyContent: "flex-end" }, { opacity: fadeAnimation }]}>
                    {Platform.OS === "ios" ? (
                        <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
                            <Animated.View style={[styles.modalContent, { transform: [{ translateY }] }]}>
                                <View style={styles.dragIndicator} />
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Ionicons name="close-circle" size={32} color="#e2e8f0" />
                                </TouchableOpacity>

                                <View style={styles.headerArea}>
                                    <Text style={styles.modalTitle}>إتمام الطلب</Text>
                                    <Text style={styles.modalSubtitle}>حدد عنوان التوصيل على الخريطة</Text>
                                </View>

                                {fetchingAddress ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="large" color="#0ea5e9" />
                                        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
                                    </View>
                                ) : (
                                    <>
                                        <TabHeader
                                            activeTab={activeTab}
                                            setActiveTab={setActiveTab}
                                            setFormError={setFormError}
                                            setUserTabInteracted={setUserTabInteracted}
                                            savedAddress={savedAddress}
                                            selectedLocation={selectedLocation}
                                            requestCurrentLocation={requestCurrentLocation}
                                        />

                                        {formError ? (
                                            <View style={styles.errorBox}>
                                                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                                                <Text style={styles.errorTextCenter}>{formError}</Text>
                                            </View>
                                        ) : null}

                                        <ScrollView
                                            style={styles.scrollArea}
                                            contentContainerStyle={styles.scrollContent}
                                            showsVerticalScrollIndicator={false}
                                            nestedScrollEnabled={true}
                                            keyboardShouldPersistTaps="handled"
                                            alwaysBounceVertical={true}
                                            scrollEventThrottle={16}
                                        >
                                            {activeTab === "saved" ? (
                                                <SavedAddressTab
                                                    savedAddress={savedAddress}
                                                    staticMapHtml={staticMapHtml}
                                                    savedNotes={savedNotes}
                                                    setSavedNotes={setSavedNotes}
                                                />
                                            ) : (
                                                <NewAddressTab
                                                    newMapRef={newMapRef}
                                                    interactiveMapHtml={interactiveMapHtml}
                                                    handleMapMessage={handleMapMessage}
                                                    handleRecenter={handleRecenter}
                                                    locatingUser={locatingUser}
                                                    selectedLocation={selectedLocation}
                                                    fullName={fullName}
                                                    setFullName={setFullName}
                                                    addressLine1={addressLine1}
                                                    setAddressLine1={setAddressLine1}
                                                    phone={phone}
                                                    setPhone={setPhone}
                                                    notes={notes}
                                                    setNotes={setNotes}
                                                />
                                            )}
                                        </ScrollView>

                                        <View style={styles.footerArea}>
                                            <TouchableOpacity
                                                style={styles.submitBtn}
                                                onPress={activeTab === "saved" ? handleCheckoutWithSaved : handleCheckoutWithNew}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="#fff" />
                                                ) : (
                                                    <View style={styles.btnContent}>
                                                        <Text style={styles.submitBtnText}>إرسال الطلب عبر واتساب</Text>
                                                        <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </Animated.View>
                        </KeyboardAvoidingView>
                    ) : (
                        <View style={styles.keyboardView}>
                            <Animated.View style={[styles.modalContent, { transform: [{ translateY }] }]}>
                                <View style={styles.dragIndicator} />
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Ionicons name="close-circle" size={32} color="#e2e8f0" />
                                </TouchableOpacity>

                                <View style={styles.headerArea}>
                                    <Text style={styles.modalTitle}>إتمام الطلب</Text>
                                    <Text style={styles.modalSubtitle}>حدد عنوان التوصيل على الخريطة</Text>
                                </View>

                                {fetchingAddress ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="large" color="#0ea5e9" />
                                        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
                                    </View>
                                ) : (
                                    <>
                                        <TabHeader
                                            activeTab={activeTab}
                                            setActiveTab={setActiveTab}
                                            setFormError={setFormError}
                                            setUserTabInteracted={setUserTabInteracted}
                                            savedAddress={savedAddress}
                                            selectedLocation={selectedLocation}
                                            requestCurrentLocation={requestCurrentLocation}
                                        />

                                        {formError ? (
                                            <View style={styles.errorBox}>
                                                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                                                <Text style={styles.errorTextCenter}>{formError}</Text>
                                            </View>
                                        ) : null}

                                        <ScrollView
                                            style={styles.scrollArea}
                                            contentContainerStyle={styles.scrollContent}
                                            showsVerticalScrollIndicator={false}
                                            nestedScrollEnabled={true}
                                            keyboardShouldPersistTaps="handled"
                                            alwaysBounceVertical={true}
                                            scrollEventThrottle={16}
                                        >
                                            {activeTab === "saved" ? (
                                                <SavedAddressTab
                                                    savedAddress={savedAddress}
                                                    staticMapHtml={staticMapHtml}
                                                    savedNotes={savedNotes}
                                                    setSavedNotes={setSavedNotes}
                                                />
                                            ) : (
                                                <NewAddressTab
                                                    newMapRef={newMapRef}
                                                    interactiveMapHtml={interactiveMapHtml}
                                                    handleMapMessage={handleMapMessage}
                                                    handleRecenter={handleRecenter}
                                                    locatingUser={locatingUser}
                                                    selectedLocation={selectedLocation}
                                                    fullName={fullName}
                                                    setFullName={setFullName}
                                                    addressLine1={addressLine1}
                                                    setAddressLine1={setAddressLine1}
                                                    phone={phone}
                                                    setPhone={setPhone}
                                                    notes={notes}
                                                    setNotes={setNotes}
                                                />
                                            )}
                                        </ScrollView>

                                        <View style={styles.footerArea}>
                                            <TouchableOpacity
                                                style={styles.submitBtn}
                                                onPress={activeTab === "saved" ? handleCheckoutWithSaved : handleCheckoutWithNew}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="#fff" />
                                                ) : (
                                                    <View style={styles.btnContent}>
                                                        <Text style={styles.submitBtnText}>إرسال الطلب عبر واتساب</Text>
                                                        <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </Animated.View>
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}
