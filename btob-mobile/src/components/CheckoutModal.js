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
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import apiClient from "../api/client";
import { useNotifications } from "../context/NotificationContext";

// Modular Sub-components
import { getCheckoutStyles } from './checkout/CheckoutStyles';
import { getMapHtml } from './checkout/MapHelper';
import TabHeader from './checkout/TabHeader';
import SavedAddressTab from './checkout/SavedAddressTab';
import NewAddressTab from './checkout/NewAddressTab';
import { getSupplierTheme } from "../theme/supplierTheme";

// Default to Sana'a, Yemen
const DEFAULT_LAT = 15.3694;
const DEFAULT_LNG = 44.191;

export default function CheckoutModal({ visible, onClose, cart, supplierId, onSuccess, primaryColor: initialPrimaryColor, supplierData }) {
    const theme = getSupplierTheme(supplierData);
    const styles = useMemo(() => getCheckoutStyles(theme), [theme]);
    const primaryColor = theme.primary;
    const [activeTab, setActiveTab] = useState("saved");
    const [loading, setLoading] = useState(false);
    const [fetchingAddress, setFetchingAddress] = useState(true);
    const [savedAddress, setSavedAddress] = useState(null);
    const { showNotification } = useNotifications();

    // Form State
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
            if (supplierId && String(supplierId) !== 'undefined') {
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
    }, [visible, supplierId]);

    const fetchPaymentMethods = async () => {
        setFetchingMethods(true);
        try {
            const response = await apiClient.get(`/merchant/payment-settings/?merchant_id=${supplierId}`);
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
            formData.append('supplier_id', supplierId);
            
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
            <View style={styles.headerArea}>
                <Text style={styles.modalTitle}>إتمام الطلب</Text>
                <View style={styles.stepperContainer}>
                    <View style={[styles.stepCircle, currentStep === 'address' && { backgroundColor: primaryColor }]}>
                        <Ionicons name="location-outline" size={16} color={currentStep === 'address' ? "#fff" : "#94a3b8"} />
                    </View>
                    <View style={styles.stepConnector} />
                    <View style={[styles.stepCircle, currentStep === 'payment' && { backgroundColor: primaryColor }]}>
                        <Ionicons name="card-outline" size={16} color={currentStep === 'payment' ? "#fff" : "#94a3b8"} />
                    </View>
                </View>
                <Text style={styles.modalSubtitle}>
                    {currentStep === 'address' ? "حدد عنوان التوصيل على الخريطة" : "اختر وسيلة الدفع المناسبة"}
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
                        keyboardShouldPersistTaps="handled"
                        alwaysBounceVertical={true}
                        scrollEventThrottle={16}
                    >
                        {currentStep === 'address' ? (
                            activeTab === "saved" ? (
                                <SavedAddressTab
                                    savedAddress={savedAddress}
                                    staticMapHtml={staticMapHtml}
                                    savedNotes={savedNotes}
                                    setSavedNotes={setSavedNotes}
                                    theme={theme}
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
                                                    style={[
                                                        styles.paymentItem,
                                                        selectedMethod?.id === method.id && { borderColor: primaryColor, backgroundColor: theme.primaryMuted }
                                                    ]}
                                                    onPress={() => setSelectedMethod(method)}
                                                >
                                                    <Ionicons 
                                                        name={method.requires_proof ? "wallet-outline" : "cash-outline"} 
                                                        size={24} 
                                                        color={selectedMethod?.id === method.id ? primaryColor : "#64748b"} 
                                                    />
                                                    <Text style={[
                                                        styles.paymentItemText,
                                                        selectedMethod?.id === method.id && { color: primaryColor, fontWeight: "bold" }
                                                    ]}>
                                                        {method.method_name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                            {supplierMethods.length === 0 && (
                                                 <Text style={styles.noMethodsText}>لا توجد فروع دفع إلكترونية متاحة حالياً. يتم الدفع عند الاستلام.</Text>
                                            )}
                                        </View>

                                        {selectedMethod && selectedMethod.account_field_value ? (
                                            <View style={styles.accountCard}>
                                                <View style={styles.accountHeader}>
                                                    <Text style={styles.accountLabel}>{selectedMethod.account_field_name || "رقم الحساب"}</Text>
                                                    <TouchableOpacity onPress={() => copyToClipboard(selectedMethod.account_field_value)}>
                                                        <Ionicons name="copy-outline" size={20} color={primaryColor} />
                                                    </TouchableOpacity>
                                                </View>
                                                <Text style={styles.accountNumber}>{selectedMethod.account_field_value}</Text>
                                            </View>
                                        ) : null}

                                        {selectedMethod && selectedMethod.requires_proof ? (
                                            <View style={styles.receiptSection}>
                                                <Text style={styles.receiptLabel}>إرفاق إيصال السداد</Text>
                                                <TouchableOpacity style={styles.uploadBox} onPress={pickReceipt}>
                                                    {receiptImage ? (
                                                        <View style={styles.receiptPreview}>
                                                            <Ionicons name="image" size={30} color={primaryColor} />
                                                            <Text style={styles.receiptName} numberOfLines={1}>{receiptImage.name || 'تم اختيار الصورة'}</Text>
                                                            <TouchableOpacity onPress={() => setReceiptImage(null)} style={styles.removeReceipt}>
                                                                <Ionicons name="close-circle" size={20} color="#ef4444" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    ) : (
                                                        <>
                                                            <Ionicons name="camera-outline" size={32} color="#94a3b8" />
                                                            <Text style={styles.uploadText}>اضغط هنا لاختيار صورة الإيصال</Text>
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
                                style={[styles.submitBtn, { backgroundColor: primaryColor, shadowColor: primaryColor }]}
                                onPress={handleProceedToPayment}
                            >
                                <View style={styles.btnContent}>
                                    <Text style={styles.submitBtnText}>التالي: وسيلة الدفع</Text>
                                    <Ionicons name="chevron-back" size={22} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.finalFooter}>
                                <TouchableOpacity
                                    style={styles.backBtn}
                                    onPress={() => setCurrentStep("address")}
                                >
                                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                                    <Text style={styles.backBtnText}>رجوع</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitBtn, { flex: 1, marginLeft: 12, backgroundColor: primaryColor, shadowColor: primaryColor }]}
                                    onPress={handleCheckout}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={styles.btnContent}>
                                            <Text style={styles.submitBtnText}>إرسال الطلب</Text>
                                            <Ionicons name="logo-whatsapp" size={22} color="#fff" style={{ marginLeft: 8 }} />
                                        </View>
                                    )}
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
                                    <Ionicons name="close-circle" size={32} color={theme.text} />
                                </TouchableOpacity>
                                {renderContent()}
                            </Animated.View>
                        </KeyboardAvoidingView>
                    ) : (
                        <View style={styles.keyboardView}>
                            <Animated.View style={[styles.modalContent, { transform: [{ translateY }] }]}>
                                <View style={styles.dragIndicator} />
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Ionicons name="close-circle" size={32} color={theme.text} />
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
