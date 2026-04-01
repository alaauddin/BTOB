import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, 
    ActivityIndicator, Image, Platform, ScrollView, KeyboardAvoidingView,
    Dimensions, Animated
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function OnboardingModal({ visible, stepKey, onClose, onSuccess, activeMerchant }) {
    const { setActiveMerchant } = useAuth();
    const primaryColor = activeMerchant?.primary_color || '#2B5876';

    const [loading, setLoading] = useState(false);
    const [fetchingDeps, setFetchingDeps] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    
    // Form States
    const [subdomain, setSubdomain] = useState('');
    const [lat, setLat] = useState(15.3694); // Default to Sana'a
    const [lng, setLng] = useState(44.1910);
    const [selectedCurrencyId, setSelectedCurrencyId] = useState(null);
    const [localImage, setLocalImage] = useState(null);

    // Map State
    const [mapVisible, setMapVisible] = useState(false);
    const mapRef = useRef(null);

    useEffect(() => {
        if (visible) {
            setSubdomain(activeMerchant?.subdomain || '');
            setLat(parseFloat(activeMerchant?.latitude) || 15.3694);
            setLng(parseFloat(activeMerchant?.longitude) || 44.1910);
            setSelectedCurrencyId(activeMerchant?.currency_id || null);
            setLocalImage(null);
            setMapVisible(false);

            if (stepKey === 'has_currency' && currencies.length === 0) {
                fetchCurrencies();
            }
        }
    }, [visible, stepKey, activeMerchant]);

    const fetchCurrencies = async () => {
        setFetchingDeps(true);
        try {
            const res = await client.get('/core/currencies/');
            if (res.data && res.data.success) {
                setCurrencies(res.data.currencies || []);
            }
        } catch (err) {
            console.error('Failed to fetch currencies', err);
        } finally {
            setFetchingDeps(false);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: stepKey === 'has_cover' ? [16, 9] : [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            setLocalImage(result.assets[0]);
        }
    };

    const handleGetLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            alert('نحتاج لإذن الوصول للمقع لتحديد مكانك بدقة');
            return;
        }
        setFetchingDeps(true);
        try {
            let location = await Location.getCurrentPositionAsync({});
            setLat(location.coords.latitude);
            setLng(location.coords.longitude);
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
            }
        } catch (e) {
            console.log(e);
        } finally {
            setFetchingDeps(false);
        }
    };

    const handleSave = async () => {
        if (!activeMerchant?.id) return;
        setLoading(true);
        try {
            if (stepKey === 'has_logo' || stepKey === 'has_cover') {
                if (!localImage) return onClose();
                const formData = new FormData();
                formData.append('merchant_id', activeMerchant.id);
                formData.append(stepKey === 'has_logo' ? 'profile_picture' : 'panal_picture', {
                    uri: localImage.uri,
                    name: 'upload.jpg',
                    type: 'image/jpeg'
                });
                const res = await client.post('/merchant/branding/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data.success) {
                    setActiveMerchant({ ...activeMerchant, ...res.data.profile });
                    onSuccess();
                }
            } else {
                const patchData = { merchant_id: activeMerchant.id };
                if (stepKey === 'has_subdomain') patchData.subdomain = subdomain;
                if (stepKey === 'has_location') {
                    patchData.latitude = parseFloat(lat).toFixed(6);
                    patchData.longitude = parseFloat(lng).toFixed(6);
                }
                if (stepKey === 'has_currency') patchData.currency_id = selectedCurrencyId;

                const res = await client.patch('/merchant/profile/', patchData);
                if (res.data.success) {
                    setActiveMerchant({ ...activeMerchant, ...res.data.profile });
                    onSuccess();
                }
            }
        } catch (err) {
            console.error('Modal Save error', err?.response?.data || err);
            alert("حدث خطأ أثناء الحفظ");
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        if (stepKey === 'has_subdomain') {
            return (
                <View style={styles.contentWrap}>
                    <View style={styles.inputContainer}>
                        <Feather name="globe" size={20} color={primaryColor} style={styles.inputIcon} />
                        <TextInput 
                            style={styles.input} 
                            value={subdomain} 
                            onChangeText={setSubdomain}
                            placeholder="اسم المتجر بالانجليزي (مثال: my-store)"
                            autoCapitalize="none"
                            textAlign="right"
                        />
                    </View>
                    <LinearGradient colors={[primaryColor + '15', 'transparent']} style={styles.previewBox}>
                        <Text style={styles.previewLabel}>سيصبح رابط متجرك:</Text>
                        <Text style={[styles.previewUrl, { color: primaryColor }]}>{subdomain || 'yourstore'}.rawaage.com</Text>
                    </LinearGradient>
                </View>
            );
        }
        if (stepKey === 'has_location') {
            return (
                <View style={styles.contentWrap}>
                    <Text style={styles.desc}>حدد موقع متجرك على الخريطة لتسهيل وصول العملاء إليك</Text>
                    
                    <View style={styles.mapContainer}>
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={{
                                latitude: lat,
                                longitude: lng,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                            onPress={(e) => {
                                setLat(e.nativeEvent.coordinate.latitude);
                                setLng(e.nativeEvent.coordinate.longitude);
                            }}
                        >
                            <Marker 
                                coordinate={{ latitude: lat, longitude: lng }}
                                draggable
                                onDragEnd={(e) => {
                                    setLat(e.nativeEvent.coordinate.latitude);
                                    setLng(e.nativeEvent.coordinate.longitude);
                                }}
                                pinColor={primaryColor}
                            />
                        </MapView>
                        
                        <TouchableOpacity style={styles.myLocationBtn} onPress={handleGetLocation}>
                             <Feather name="crosshair" size={20} color={primaryColor} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.coordBox}>
                        <View style={styles.coordItem}>
                            <Text style={styles.coordLabel}>خط العرض</Text>
                            <Text style={styles.coordValue}>{lat.toFixed(6)}</Text>
                        </View>
                        <View style={styles.coordItem}>
                            <Text style={styles.coordLabel}>خط الطول</Text>
                            <Text style={styles.coordValue}>{lng.toFixed(6)}</Text>
                        </View>
                    </View>
                </View>
            );
        }
        if (stepKey === 'has_currency') {
            if (fetchingDeps) return <ActivityIndicator color={primaryColor} style={{padding: 40}} size="large" />;
            return (
                <View style={styles.contentWrap}>
                    <Text style={styles.desc}>اختر العملة التي ستظهر بها أسعار منتجاتك</Text>
                    <ScrollView style={{maxHeight: 300}} showsVerticalScrollIndicator={false}>
                        {currencies.map(c => (
                            <TouchableOpacity 
                                key={c.id} 
                                style={[styles.currencyCard, selectedCurrencyId === c.id && { borderColor: primaryColor, backgroundColor: primaryColor + '08' }]}
                                onPress={() => setSelectedCurrencyId(c.id)}
                            >
                                <View style={styles.currencyInfo}>
                                    <View style={[styles.currencyIcon, { backgroundColor: selectedCurrencyId === c.id ? primaryColor : '#F1F5F9' }]}>
                                        <Text style={[styles.currencySymbol, { color: selectedCurrencyId === c.id ? '#FFF' : '#64748B' }]}>{c.symbol}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.currencyName}>{c.name}</Text>
                                        <Text style={styles.currencyCode}>{c.code}</Text>
                                    </View>
                                </View>
                                {selectedCurrencyId === c.id && <Feather name="check-circle" size={22} color={primaryColor} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            );
        }
        if (stepKey === 'has_logo' || stepKey === 'has_cover') {
            return (
                <View style={styles.contentWrap}>
                    <Text style={styles.desc}>
                        {stepKey === 'has_logo' ? 'أضف شعار متجرك لتقوية علامتك التجارية' : 'أضف صورة غلاف تعكس هوية متجرك'}
                    </Text>
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                        <LinearGradient 
                            colors={['#F8FAFC', '#F1F5F9']} 
                            style={[styles.premiumImagePicker, { borderColor: primaryColor + '44' }]}
                        >
                            {localImage ? (
                                <Image source={{ uri: localImage.uri }} style={styles.pickedImage} resizeMode={stepKey === 'has_logo' ? 'contain' : 'cover'} />
                            ) : (
                                <View style={styles.pickerPlaceHolder}>
                                    <View style={[styles.pickerIconWrap, { backgroundColor: primaryColor + '15' }]}>
                                        <Feather name={stepKey === 'has_logo' ? 'image' : 'layout'} size={32} color={primaryColor} />
                                    </View>
                                    <Text style={styles.pickerTitle}>اضغط لاختيار صورة</Text>
                                    <Text style={styles.pickerSub}>يفضل استخدام صور عالية الجودة</Text>
                                </View>
                            )}
                            {localImage && (
                                <View style={[styles.changeBadge, { backgroundColor: primaryColor }]}>
                                    <Feather name="edit-2" size={14} color="#FFF" />
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            );
        }
        return null;
    };

    const titles = {
        has_logo: 'شعار المتجر', has_cover: 'غلاف المتجر',
        has_location: 'موقع المتجر', has_currency: 'عملة المتجر',
        has_subdomain: 'رابط المتجر'
    };

    const icons = {
        has_logo: 'image', has_cover: 'layout',
        has_location: 'map-pin', has_currency: 'dollar-sign',
        has_subdomain: 'globe'
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={{flex: 1}} onPress={onClose} activeOpacity={1} />
                <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.modalWrap}>
                    <View style={styles.modalContent}>
                        <View style={styles.dragNotch} />
                        
                        <View style={styles.header}>
                            <View style={[styles.headerIconWrap, { backgroundColor: primaryColor + '15' }]}>
                                <Feather name={icons[stepKey]} size={20} color={primaryColor} />
                            </View>
                            <Text style={styles.title}>{titles[stepKey] || 'إعدادات المتجر'}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Feather name="x" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.body}>
                            {renderContent()}
                        </View>

                        <View style={styles.footer}>
                            <TouchableOpacity activeOpacity={0.8} style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleSave} disabled={loading}>
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <View style={styles.btnInner}>
                                        <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
                                        <Feather name="arrow-left" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    modalWrap: { width: '100%' },
    modalContent: { 
        backgroundColor: '#fff', 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        paddingHorizontal: 20, 
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24, 
        maxHeight: height * 0.85,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10
    },
    dragNotch: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20 },
    headerIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    title: { fontSize: 20, fontWeight: '800', color: '#0F172A', flex: 1, textAlign: 'right' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    desc: { fontSize: 13, color: '#64748B', textAlign: 'right', marginBottom: 20, lineHeight: 20 },
    body: { marginBottom: 20 },
    
    // Form Components
    contentWrap: { marginHorizontal: 4 },
    inputContainer: { 
        flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, 
        borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56
    },
    inputIcon: { marginLeft: 12 },
    input: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B', textAlign: 'right' },
    previewBox: { marginTop: 16, borderRadius: 16, padding: 16, alignItems: 'center' },
    previewLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
    previewUrl: { fontSize: 16, fontWeight: '800' },

    // Map Components
    mapContainer: { width: '100%', height: 280, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F1F5F9', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    map: { flex: 1 },
    myLocationBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#FFF', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowOpacity: 0.1, shadowRadius: 4 },
    coordBox: { flexDirection: 'row', gap: 12 },
    coordItem: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    coordLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginBottom: 2 },
    coordValue: { fontSize: 14, fontWeight: '700', color: '#475569' },

    // Currency Components
    currencyCard: { 
        flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', 
        padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#F1F5F9', marginBottom: 10
    },
    currencyInfo: { flexDirection: 'row-reverse', alignItems: 'center' },
    currencyIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    currencySymbol: { fontSize: 16, fontWeight: '800' },
    currencyName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    currencyCode: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

    // Image Picker Components
    premiumImagePicker: { 
        width: '100%', height: 200, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', 
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden' 
    },
    pickerPlaceHolder: { alignItems: 'center' },
    pickerIconWrap: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    pickerTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
    pickerSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
    pickedImage: { width: '100%', height: '100%' },
    changeBadge: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },

    // Footer
    saveBtn: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    btnInner: { flexDirection: 'row-reverse', alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' }
});
