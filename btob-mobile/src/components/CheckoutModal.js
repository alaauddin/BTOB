import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Linking, Alert, ScrollView, Animated, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import apiClient from "../api/client";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { BRAND } from '../theme/brand';

// Modular Sub-components
import { getCheckoutStyles } from './checkout/CheckoutStyles';
import TabHeader from './checkout/TabHeader';
import SavedAddressTab from './checkout/SavedAddressTab';
import NewAddressTab from './checkout/NewAddressTab';
import MapView, { Marker } from './MapModule';
import { getSupplierTheme } from "../theme/supplierTheme";
import Text from './AppText';

// Default to Sana'a, Yemen
const DEFAULT_LAT = 15.3694;
const DEFAULT_LNG = 44.191;

export default function CheckoutModal({ visible, onClose, cart, supplierId, onSuccess, primaryColor: initialPrimaryColor, supplierData }) {
    const { isMerchant } = useAuth();
    const theme = getSupplierTheme(supplierData);
    const styles = useMemo(() => getCheckoutStyles(theme), [theme]);
    const primaryColor = theme.primary || BRAND.colors.primary;
    const [activeTab, setActiveTab] = useState("saved");
    const [loading, setLoading] = useState(false);
    const [fetchingAddress, setFetchingAddress] = useState(true);
    const [savedAddress, setSavedAddress] = useState(null);
    const { showNotification } = useNotifications();

    // Form State
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [fullName, setFullName] = useState("");
    const [addressLine1, setAddressLine1] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");
    const [savedNotes, setSavedNotes] = useState("");
    const [userTabInteracted, setUserTabInteracted] = useState(false);
    
    // Payment State
    const [currentStep, setCurrentStep] = useState("address"); // "address" or "payment"
    const [supplierMethods, setSupplierMethods] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [receiptImage, setReceiptImage] = useState(null);
    const [fetchingMethods, setFetchingMethods] = useState(false);

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
    const mapRef = useRef(null);

    useEffect(() => {
        if (visible) {
            setUserTabInteracted(false);
            Animated.parallel([
                Animated.timing(slideAnimation, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.timing(fadeAnimation, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
            const targetId = supplierId || cart?.supplier?.id;
            if (targetId && String(targetId) !== 'undefined') {
                fetchSavedAddress();
                fetchPaymentMethods();
            }
        } else {
            slideAnimation.setValue(0);
            fadeAnimation.setValue(0);
            setCurrentStep("address");
            setReceiptImage(null);
            // Default selection will be handled in fetchPaymentMethods once data arrives
            setTimeout(() => { setFormError(""); }, 300);
        }
    }, [visible, supplierId, cart]);

    const fetchPaymentMethods = async () => {
        setFetchingMethods(true);
        const targetSupplierId = supplierId || cart?.supplier?.id;
        try {
            const response = await apiClient.get(`/merchant/payment-settings/`);
            if (response.data) {
                const methods = response.data.results || response.data;
                const activeMethods = methods.filter(m => m.is_active);
                
                // Always inject Cash on Delivery as the system default
                const codMethod = {
                    id: 'cod', // special ID for default COD
                    payment_method: 3, 
                    method_name: 'الدفع عند الاستلام',
                    requires_proof: false,
                    is_active: true
                };
                
                const finalMethods = [codMethod, ...activeMethods];
                setSupplierMethods(finalMethods);
                
                // Default to COD
                setSelectedMethod(codMethod);
            }
        } catch (error) {
            console.log("Fetch methods error:", error);
        } finally {
            setFetchingMethods(false);
        }
    };

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
                mapRef.current?.animateToRegion({
                    ...coord,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
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
                mapRef.current?.animateToRegion({
                    ...coord,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
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

    const handleLocationSelect = (coord) => {
        setSelectedLocation(coord);
        reverseGeocode(coord.latitude, coord.longitude);
    };

    const pickReceipt = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showNotification({ title: 'عذراً', message: 'نحتاج إلى إذن الوصول للصور لإرفاق الإيصال', type: 'warning' });
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setReceiptImage(result.assets[0]);
        }
    };

    const copyToClipboard = async (text) => {
        await Clipboard.setStringAsync(text);
        showNotification({ title: 'تم النسخ', message: 'تم نسخ رقم الحساب إلى الحافظة', type: 'success' });
    };

    const validateAddress = () => {
        if (activeTab === 'new') {
            if (!addressLine1.trim()) { setFormError("يرجى إدخال الموقع (العنوان)"); return false; }
            if (!phone.trim()) { setFormError("يرجى إدخال رقم الهاتف"); return false; }
        }
        return true;
    };

    const handleProceedToPayment = () => {
        if (validateAddress()) {
            setCurrentStep("payment");
        }
    };

    const handleCheckout = async () => {
        setFormError("");
        if (selectedMethod?.requires_proof && !receiptImage) {
            setFormError("يرجى إرفاق صورة إيصال الدفع");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            const targetId = supplierId || cart?.supplier?.id;
            if (isMerchant && targetId) {
                formData.append('supplier_id', targetId);
            }
            
            if (activeTab === 'saved') {
                formData.append('address_line2', savedNotes);
            } else {
                formData.append('full_name', fullName);
                formData.append('address_line1', addressLine1);
                formData.append('phone', phone);
                formData.append('address_line2', notes);
                formData.append('latitude', selectedLocation?.latitude || "");
                formData.append('longitude', selectedLocation?.longitude || "");
            }

            if (selectedMethod) {
                // If it's our special 'cod' ID, we'll send the global payment method ID (3)
                const methodId = selectedMethod.id === 'cod' ? 3 : selectedMethod.id;
                formData.append('payment_method_id', methodId);
                
                // If it was our injected COD, tell backend it's a global method ID 
                // Alternatively, the backend utility will handle id=3 specifically
                if (selectedMethod.id === 'cod') {
                    formData.append('is_system_default_payment', 'true');
                }
            }

            if (receiptImage) {
                const uri = receiptImage.uri;
                formData.append('receipt', {
                    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                    name: uri.split('/').pop() || 'receipt.jpg',
                    type: 'image/jpeg'
                });
            }

            const endpoint = activeTab === 'saved' ? '/carts/checkout_registered_address/' : '/carts/checkout_custom_address/';
            const response = await apiClient.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success && response.data.wa_url) {
                Linking.openURL(response.data.wa_url).catch(() => showNotification({ title: 'عذراً', message: 'حدث خطأ في فتح واتساب', type: 'error' }));
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

    const renderContent = () => (
        <>
            {/* Premium Header with Glassmorphism Effect */}
            <View style={styles.blurHeader}>
                <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.7)' }]} />
            </View>

            <View style={styles.headerArea}>
                <View style={styles.stepperContainer}>
                    <View style={[styles.stepCircle, currentStep === 'payment' && styles.activeStep]}>
                        <Ionicons name="card" size={18} color={currentStep === 'payment' ? "#FFF" : "#94A3B8"} />
                    </View>
                    <View style={styles.stepConnector} />
                    <View style={[styles.stepCircle, currentStep === 'address' && styles.activeStep]}>
                        <Ionicons name="location" size={18} color={currentStep === 'address' ? "#FFF" : "#94A3B8"} />
                    </View>
                </View>
                <Text style={styles.modalTitle}>
                    {currentStep === 'address' ? "تحديد الموقع" : "طريقة الدفع"}
                </Text>
                <Text style={styles.modalSubtitle}>
                    {currentStep === 'address' ? "يرجى تحديد عنوان التوصيل بدقة" : "اختر وسيلة الدفع المناسبة لإتمام طلبك"}
                </Text>
            </View>

            {fetchingAddress ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
                </View>
            ) : (
                <>
                    {currentStep === 'address' && (
                        <TabHeader
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            setFormError={setFormError}
                            setUserTabInteracted={setUserTabInteracted}
                            savedAddress={savedAddress}
                            selectedLocation={selectedLocation}
                            requestCurrentLocation={requestCurrentLocation}
                            primaryColor={primaryColor}
                            theme={theme}
                        />
                    )}

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
                        scrollEnabled={scrollEnabled}
                        keyboardShouldPersistTaps="handled"
                        alwaysBounceVertical={true}
                        scrollEventThrottle={16}
                    >
                        {currentStep === 'address' ? (
                            activeTab === "saved" ? (
                                <SavedAddressTab
                                    savedAddress={savedAddress}
                                    savedLatLng={savedLatLng}
                                    savedNotes={savedNotes}
                                    setSavedNotes={setSavedNotes}
                                    setScrollEnabled={setScrollEnabled}
                                    theme={theme}
                                />
                            ) : (
                                <NewAddressTab
                                    mapRef={mapRef}
                                    handleLocationSelect={handleLocationSelect}
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
                                    setScrollEnabled={setScrollEnabled}
                                    primaryColor={primaryColor}
                                    theme={theme}
                                />
                            )
                        ) : (
                            <View style={styles.paymentContainer}>
                                {fetchingMethods ? (
                                    <ActivityIndicator size="small" color={primaryColor} />
                                ) : (
                                    <>
                                        <View style={styles.paymentGrid}>
                                            {supplierMethods.map((method) => (
                                                <TouchableOpacity
                                                    key={method.id}
                                                    activeOpacity={0.8}
                                                    style={[
                                                        styles.paymentItem,
                                                        selectedMethod?.id === method.id && styles.selectedPaymentItem
                                                    ]}
                                                    onPress={() => setSelectedMethod(method)}
                                                >
                                                    <View style={[styles.iconCircle, { width: 44, height: 44, marginBottom: 4 }]}>
                                                        <Ionicons 
                                                            name={method.id === 'cod' ? "cash" : "card"} 
                                                            size={24} 
                                                            color={selectedMethod?.id === method.id ? primaryColor : "#94A3B8"} 
                                                        />
                                                    </View>
                                                    <Text style={[
                                                        styles.paymentItemText,
                                                        selectedMethod?.id === method.id && styles.activeTabText
                                                    ]}>
                                                        {method.method_name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        {selectedMethod && selectedMethod.account_field_value ? (
                                            <View style={styles.accountCard}>
                                                <View style={styles.accountHeader}>
                                                    <TouchableOpacity onPress={() => copyToClipboard(selectedMethod.account_field_value)}>
                                                        <Ionicons name="copy-outline" size={20} color={primaryColor} />
                                                    </TouchableOpacity>
                                                    <Text style={styles.accountLabel}>{selectedMethod.account_field_name || "رقم الحساب"}</Text>
                                                </View>
                                                <Text style={[styles.accountNumber, { textAlign: 'auto' }]}>{selectedMethod.account_field_value}</Text>
                                            </View>
                                        ) : null}

                                        {selectedMethod && selectedMethod.requires_proof ? (
                                            <View style={styles.receiptSection}>
                                                <Text style={styles.receiptLabel}>إيصال سداد المبلغ</Text>
                                                <TouchableOpacity style={styles.uploadBox} onPress={pickReceipt} activeOpacity={0.7}>
                                                    {receiptImage ? (
                                                        <View style={styles.receiptPreview}>
                                                            <TouchableOpacity onPress={() => setReceiptImage(null)} style={styles.removeReceipt}>
                                                                <Ionicons name="close-circle" size={24} color="#ef4444" />
                                                            </TouchableOpacity>
                                                            <Text style={styles.receiptName} numberOfLines={1}>{receiptImage.name || 'تم اختيار الإيصال'}</Text>
                                                            <Ionicons name="checkmark-circle" size={30} color={BRAND.colors.success} />
                                                        </View>
                                                    ) : (
                                                        <>
                                                            <Feather name="upload-cloud" size={32} color="#94A3B8" />
                                                            <Text style={styles.uploadText}>اضغط لرفع صورة إيصال الدفع</Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        ) : null}
                                    </>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.footerArea}>
                        {currentStep === 'address' ? (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                style={styles.submitBtn}
                                onPress={handleProceedToPayment}
                            >
                                <View style={styles.btnContent}>
                                    <Text style={styles.submitBtnText}>متابعة للدفع</Text>
                                    <Ionicons name="arrow-back" size={22} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.finalFooter}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[styles.submitBtn, { flex: 1, backgroundColor: primaryColor }]}
                                    onPress={handleCheckout}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={styles.btnContent}>
                                            <Text style={styles.submitBtnText}>تأكيد وإرسال الطلب</Text>
                                            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[styles.backBtn, { marginLeft: 12 }]}
                                    onPress={() => setCurrentStep("address")}
                                >
                                    <Ionicons name="arrow-forward" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </>
            )}
        </>
    );

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
                                    <Ionicons name="close" size={24} color="#1E293B" />
                                </TouchableOpacity>
                                {renderContent()}
                            </Animated.View>
                        </KeyboardAvoidingView>
                    ) : (
                        <View style={styles.keyboardView}>
                            <Animated.View style={[styles.modalContent, { transform: [{ translateY }] }]}>
                                <View style={styles.dragIndicator} />
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Ionicons name="close" size={24} color="#1E293B" />
                                </TouchableOpacity>
                                {renderContent()}
                            </Animated.View>
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}
