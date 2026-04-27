import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Animated, Image, I18nManager } from 'react-native';

const IS_RTL = I18nManager.isRTL;
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { BRAND } from '../theme/brand';
import Logo from '../components/Logo';
import Text from '../components/AppText';
import TextInput from '../components/AppTextInput';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MerchantRegistrationScreen({ navigation }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotifications();

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        store_id: '',
        category_ids: [],
        phone: '',
        address: '',
        city: 'صنعاء',
        country: 'Yemen',
        primary_color: BRAND.colors.primary,
        profile_picture: null,
        panal_picture: null,
        otp: '',
    });

    const [categories, setCategories] = useState([]);
    
    // Animation states
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const contentMoveAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const isAnimating = useRef(false);

    useEffect(() => {
        fetchCategories();
        // Pulsing glow animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
                Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
            ])
        ).start();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await client.get('/supplier-categories/');
            if (response.data) {
                setCategories(response.data);
            }
        } catch (error) {
            console.error("Error fetching categories", error);
        }
    };

    const pickImage = async (field) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: field === 'profile_picture' ? [1, 1] : [16, 9],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setFormData({ ...formData, [field]: result.assets[0].uri });
        }
    };

    const nextStep = () => {
        if (loading || isAnimating.current) return;
        
        if (step < 4) {
            transitionTo(step + 1);
        } else if (step === 4) {
            handleSendOTP();
        } else {
            handleRegister();
        }
    };

    const handleSendOTP = async () => {
        if (!formData.phone) {
            showNotification({ title: 'تنبيه', message: 'يرجى إدخال رقم الهاتف أولاً', type: 'warning' });
            return;
        }
        setLoading(true);
        try {
            const response = await client.post('/auth/merchant-signup/send-otp/', { phone: formData.phone });
            if (response.data.success) {
                showNotification({ title: 'نجاح', message: 'تم إرسال رمز التحقق إلى رقمك عبر الواتساب', type: 'success' });
                transitionTo(5);
            }
        } catch (error) {
            showNotification({ title: 'خطأ', message: error.response?.data?.message || 'فشل إرسال الرمز', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const prevStep = () => {
        if (step > 1) {
            transitionTo(step - 1);
        }
    };

    const transitionTo = (nextStepNum) => {
        if (isAnimating.current) return;
        isAnimating.current = true;

        const direction = nextStepNum > step ? (IS_RTL ? 40 : -40) : (IS_RTL ? -40 : 40);
        
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
            Animated.timing(slideAnim, { toValue: direction, duration: 150, useNativeDriver: false })
        ]).start(() => {
            setStep(nextStepNum);
            slideAnim.setValue(-direction);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
                Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: false })
            ]).start(() => {
                isAnimating.current = false;
            });
        });
    };

    const toggleCategory = (id) => {
        const current = [...formData.category_ids];
        if (current.includes(id)) {
            setFormData({...formData, category_ids: current.filter(c => c !== id)});
        } else {
            setFormData({...formData, category_ids: [...current, id]});
        }
    };

    const handleRegister = async () => {
        if (!formData.username || !formData.password || !formData.name || !formData.store_id) {
            showNotification({ title: 'تنبيه', message: 'يرجى إكمال الحقول الأساسية', type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const submitData = new FormData();
            
            Object.keys(formData).forEach(key => {
                if (key === 'category_ids') {
                    formData.category_ids.forEach(id => submitData.append('category_ids', id));
                } else if (key !== 'profile_picture' && key !== 'panal_picture') {
                    submitData.append(key, formData[key]);
                }
            });

            if (formData.profile_picture) {
                submitData.append('profile_picture', { uri: formData.profile_picture, name: 'logo.jpg', type: 'image/jpeg' });
            }
            if (formData.panal_picture) {
                submitData.append('panal_picture', { uri: formData.panal_picture, name: 'cover.jpg', type: 'image/jpeg' });
            }

            const response = await client.post('/auth/merchant-signup/', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                showNotification({ title: 'تهانينا!', message: 'تم تسجيل متجرك بنجاح. مرحباً بك في رواج!', type: 'success' });
                navigation.navigate('Login');
            }
        } catch (error) {
            showNotification({ title: 'خطأ', message: error.response?.data?.message || 'فشل التسجيل. يرجى المحاولة لاحقاً', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <View style={styles.indicatorWrapper}>
            <View style={styles.indicatorTrack}>
                <Animated.View style={[
                    styles.indicatorProgress, 
                    { width: `${((step - 1) / 4) * 100}%`, backgroundColor: formData.primary_color }
                ]} />
            </View>
            <View style={styles.indicatorNodes}>
                {[1, 2, 3, 4, 5].map((s) => (
                    <View key={s} style={styles.nodeContainer}>
                        <View style={[
                            styles.nodeCircle, 
                            step >= s && { backgroundColor: formData.primary_color, borderColor: formData.primary_color },
                            step === s && { transform: [{ scale: 1.2 }], shadowColor: formData.primary_color, elevation: 10 }
                        ]}>
                            {step > s ? (
                                <Feather name="check" size={14} color="#fff" />
                            ) : (
                                <Text style={[styles.nodeText, step >= s && { color: '#fff' }]}>{s}</Text>
                            )}
                        </View>
                        <Text style={[styles.nodeLabel, step === s && { color: formData.primary_color, fontFamily: BRAND.typography.extraBold }]}>
                            {s === 1 ? 'الحساب' : s === 2 ? 'المتجر' : s === 3 ? 'التفاصيل' : s === 4 ? 'الصور' : 'التحقق'}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );

    const cardGlow = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [formData.primary_color + '10', formData.primary_color + '30']
    });

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            {/* Cinematic Mesh Background */}
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />
                <View style={[styles.meshOrb, { top: -100, right: -100, backgroundColor: formData.primary_color + '15' }]} />
                <View style={[styles.meshOrb, { bottom: -150, left: -100, backgroundColor: BRAND.colors.secondary + '10' }]} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Logo size={140} />
                    <Text style={styles.headerTitle}>بوابة رواج للأعمال</Text>
                    <Text style={styles.headerSubtitle}>انضم لآلاف المتاجر الناجحة</Text>
                </View>

                {renderStepIndicator()}

                <Animated.View style={[
                    styles.formCard, 
                    { 
                        opacity: fadeAnim, 
                        transform: [{ translateX: slideAnim }],
                        borderColor: cardGlow,
                        shadowColor: formData.primary_color
                    }
                ]}>
                    <LinearGradient 
                        colors={['rgba(255,255,255,1)', 'rgba(252,253,255,1)']} 
                        style={styles.cardInternalGradient}
                    >
                        {step === 1 && (
                            <View style={styles.stepContent}>
                                <View style={styles.stepHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: formData.primary_color + '15' }]}>
                                        <Feather name="shield" size={24} color={formData.primary_color} />
                                    </View>
                                    <View>
                                        <Text style={styles.stepTitle}>حساب التاجر</Text>
                                        <Text style={styles.stepSubtitle}>بيانات الدخول الآمنة</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>اسم المستخدم (أحرف إنجليزية وأرقام)</Text>
                                    <View style={styles.inputBox}>
                                        <Feather name="user" size={18} color="#94A3B8" />
                                        <TextInput 
                                            style={styles.textInput}
                                            placeholder="مثال: my_store_123"
                                            placeholderTextColor="#94A3B8"
                                            value={formData.username}
                                            onChangeText={(v) => setFormData({...formData, username: v.replace(/[^a-zA-Z0-9_]/g, '')})}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>رقم الهاتف</Text>
                                    <View style={styles.inputBox}>
                                        <Feather name="phone" size={18} color="#94A3B8" />
                                        <TextInput 
                                            style={styles.textInput}
                                            placeholder="77XXXXXXX"
                                            placeholderTextColor="#94A3B8"
                                            value={formData.phone}
                                            onChangeText={(v) => setFormData({...formData, phone: v})}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>كلمة المرور</Text>
                                    <View style={styles.inputBox}>
                                        <Feather name="lock" size={18} color="#94A3B8" />
                                        <TextInput 
                                            style={styles.textInput}
                                            placeholder="كلمة مرور قوية"
                                            placeholderTextColor="#94A3B8"
                                            value={formData.password}
                                            onChangeText={(v) => setFormData({...formData, password: v})}
                                            secureTextEntry
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        {step === 2 && (
                            <View style={styles.stepContent}>
                                <View style={styles.stepHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: formData.primary_color + '15' }]}>
                                        <Feather name="shopping-bag" size={24} color={formData.primary_color} />
                                    </View>
                                    <View>
                                        <Text style={styles.stepTitle}>هوية المتجر</Text>
                                        <Text style={styles.stepSubtitle}>براند متميز يبدأ من هنا</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>اسم المتجر</Text>
                                    <View style={styles.inputBox}>
                                        <Feather name="tag" size={18} color="#94A3B8" />
                                        <TextInput 
                                            style={styles.textInput}
                                            placeholder="مثلاً: متجر البركة"
                                            placeholderTextColor="#94A3B8"
                                            value={formData.name}
                                            onChangeText={(v) => setFormData({...formData, name: v})}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>رابط المتجر (ID)</Text>
                                    <View style={styles.inputBox}>
                                        <Feather name="globe" size={18} color="#94A3B8" />
                                        <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center' }}>
                                            <TextInput 
                                                style={[styles.textInput, { marginHorizontal: 0, paddingRight: 5 }]}
                                                placeholder="al-baraka"
                                                placeholderTextColor="#94A3B8"
                                                value={formData.store_id}
                                                onChangeText={(v) => setFormData({...formData, store_id: v.toLowerCase().replace(/\s+/g, '-')})}
                                                autoCapitalize="none"
                                            />
                                            <Text style={[styles.urlHint, { color: formData.primary_color }]}>.rawaage.com</Text>
                                        </View>
                                    </View>
                                </View>

                                <Text style={styles.inputLabel}>اختر مجال العمل</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                                    {categories.map(cat => (
                                        <TouchableOpacity 
                                            key={cat.id}
                                            style={[styles.catCard, formData.category_ids.includes(cat.id) && { backgroundColor: formData.primary_color, borderColor: formData.primary_color }]}
                                            onPress={() => toggleCategory(cat.id)}
                                        >
                                            <View style={styles.catIconBox}>
                                                {cat.image ? (
                                                    <Image source={{ uri: cat.image }} style={styles.catImg} />
                                                ) : (
                                                    <MaterialCommunityIcons name="tag-outline" size={24} color={formData.category_ids.includes(cat.id) ? '#fff' : formData.primary_color} />
                                                )}
                                            </View>
                                            <Text style={[styles.catName, formData.category_ids.includes(cat.id) && { color: '#fff' }]}>{cat.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {step === 3 && (
                            <View style={styles.stepContent}>
                                <View style={styles.stepHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: formData.primary_color + '15' }]}>
                                        <Feather name="feather" size={24} color={formData.primary_color} />
                                    </View>
                                    <View>
                                        <Text style={styles.stepTitle}>التفاصيل والعنوان</Text>
                                        <Text style={styles.stepSubtitle}>المسة الأخيرة لهوية متجرك</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>العنوان بالتفصيل</Text>
                                    <View style={styles.inputBox}>
                                        <Feather name="map-pin" size={18} color="#94A3B8" />
                                        <TextInput 
                                            style={styles.textInput}
                                            placeholder="الشارع، الحي، المعلم"
                                            placeholderTextColor="#94A3B8"
                                            value={formData.address}
                                            onChangeText={(v) => setFormData({...formData, address: v})}
                                        />
                                    </View>
                                </View>

                                <View style={styles.colorSection}>
                                    <Text style={styles.inputLabel}>لون هوية المتجر (المعاينة الآن)</Text>
                                    <View style={styles.colorRow}>
                                        {['#F58231', '#2B587E', '#10B981', '#6366F1', '#EC4899', '#000000'].map(color => (
                                            <TouchableOpacity 
                                                key={color}
                                                style={[styles.colorCircle, { backgroundColor: color }, formData.primary_color === color && styles.colorCircleActive]}
                                                onPress={() => setFormData({...formData, primary_color: color})}
                                            >
                                                {formData.primary_color === color && <Feather name="check" size={16} color="#fff" />}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {step === 4 && (
                            <View style={styles.stepContent}>
                                <View style={styles.stepHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: formData.primary_color + '15' }]}>
                                        <Feather name="image" size={24} color={formData.primary_color} />
                                    </View>
                                    <View>
                                        <Text style={styles.stepTitle}>الهوية البصرية</Text>
                                        <Text style={styles.stepSubtitle}>أضف شعار وغلاف متجرك</Text>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>شعار المتجر (Logo)</Text>
                                    <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('profile_picture')}>
                                        {formData.profile_picture ? (
                                            <Image source={{ uri: formData.profile_picture }} style={styles.logoPreview} />
                                        ) : (
                                            <>
                                                <Feather name="upload-cloud" size={24} color="#94A3B8" />
                                                <Text style={styles.imagePickerText}>اختر صورة الشعار</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>غلاف المتجر (Cover)</Text>
                                    <TouchableOpacity style={[styles.imagePickerBtn, { height: 120 }]} onPress={() => pickImage('panal_picture')}>
                                        {formData.panal_picture ? (
                                            <Image source={{ uri: formData.panal_picture }} style={styles.coverPreview} />
                                        ) : (
                                            <>
                                                <Feather name="upload-cloud" size={24} color="#94A3B8" />
                                                <Text style={styles.imagePickerText}>اختر صورة الغلاف</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {step === 5 && (
                            <View style={styles.stepContent}>
                                <View style={styles.stepHeader}>
                                    <View style={[styles.iconCircle, { backgroundColor: formData.primary_color + '15' }]}>
                                        <Feather name="shield" size={24} color={formData.primary_color} />
                                    </View>
                                    <View>
                                        <Text style={styles.stepTitle}>التحقق</Text>
                                        <Text style={styles.stepSubtitle}>تم إرسال رمز إلى الواتساب الخاص بك</Text>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>رمز التحقق</Text>
                                    <View style={styles.inputBox}>
                                        <Feather name="key" size={18} color="#94A3B8" />
                                        <TextInput 
                                            style={styles.textInput}
                                            placeholder="123456"
                                            placeholderTextColor="#94A3B8"
                                            value={formData.otp}
                                            onChangeText={(v) => setFormData({...formData, otp: v.replace(/[^0-9]/g, '')})}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.nextBtn, { backgroundColor: formData.primary_color, shadowColor: formData.primary_color }, loading && { opacity: 0.7 }]}
                        onPress={nextStep}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.nextBtnText}>{step === 5 ? 'ابدأ رحلة النجاح' : 'المتابعة'}</Text>
                                <Feather name={step === 5 ? 'zap' : (IS_RTL ? 'arrow-left' : 'arrow-right')} size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>

                    {step > 1 && (
                        <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
                            <Feather name={IS_RTL ? 'arrow-right' : 'arrow-left'} size={24} color={BRAND.colors.slate[600]} />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    meshOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.6 },
    scrollContent: { 
        flexGrow: 1,
        padding: 24, 
        paddingBottom: 40 
    },
    
    header: { alignItems: 'center', marginBottom: 40 },
    headerTitle: { fontSize: 30, color: BRAND.colors.slate[900], marginTop: 15, textAlign: 'center', fontFamily: BRAND.typography.extraBold },
    headerSubtitle: { fontSize: 15, color: BRAND.colors.slate[500], marginTop: 5, fontFamily: BRAND.typography.bold },
    
    // Modern Progress Bar
    indicatorWrapper: { marginBottom: 35, paddingHorizontal: 10 },
    indicatorTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
    indicatorProgress: { height: '100%', borderRadius: 3 },
    indicatorNodes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -18 },
    nodeContainer: { alignItems: 'center' },
    nodeCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', borderWidth: 3, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    nodeText: { fontSize: 12, color: '#94A3B8', fontFamily: BRAND.typography.extraBold },
    nodeLabel: { fontSize: 11, color: BRAND.colors.slate[400], marginTop: 8, fontFamily: BRAND.typography.bold },
    
    // Wow Card
    formCard: {
        borderRadius: 35,
        elevation: 20,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        borderWidth: 2,
        overflow: 'hidden',
    },
    cardInternalGradient: { padding: 28 },
    
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30 },
    iconCircle: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    stepTitle: { fontSize: 22, color: BRAND.colors.slate[900], fontFamily: BRAND.typography.extraBold },
    stepSubtitle: { fontSize: 14, color: BRAND.colors.slate[500], fontFamily: BRAND.typography.bold },
    
    inputGroup: { marginBottom: 25 },
    inputLabel: { fontSize: 14, color: BRAND.colors.slate[700], marginBottom: 12, textAlign: 'left', fontFamily: BRAND.typography.bold },
    inputBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC', 
        borderRadius: 20, 
        paddingHorizontal: 18, 
        height: 50,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    textInput: { flex: 1, height: '100%', fontSize: 16, color: BRAND.colors.slate[900], textAlign: 'left', marginHorizontal: 12, fontFamily: BRAND.typography.regular },
    urlHint: { fontSize: 15, fontFamily: BRAND.typography.extraBold },
    
    catScroll: { marginTop: 10, marginBottom: 10 },
    catCard: { width: 110, height: 120, backgroundColor: '#F8FAFC', borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginEnd: 15, borderWidth: 2, borderColor: '#E2E8F0' },
    catIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 10, elevation: 2 },
    catImg: { width: '100%', height: '100%', borderRadius: 25 },
    catName: { fontSize: 12, color: BRAND.colors.slate[700], textAlign: 'center', fontFamily: BRAND.typography.bold },
    
    colorSection: { marginTop: 10 },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'flex-start', marginTop: 15 },
    colorCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    colorCircleActive: { borderWidth: 4, borderColor: '#fff' },

    // Image Picker Styles
    imagePickerBtn: { height: 80, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    imagePickerText: { fontSize: 13, color: '#94A3B8', marginTop: 5, fontFamily: BRAND.typography.bold },
    logoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    coverPreview: { width: '100%', height: '100%', resizeMode: 'cover' },

    footer: { marginTop: 40, flexDirection: 'row', gap: 15, alignItems: 'center' },
    nextBtn: { 
        flex: 1,
        height: 64, 
        borderRadius: 22, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 15,
        elevation: 12,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 18
    },
    nextBtnText: { color: '#fff', fontSize: 18, fontFamily: BRAND.typography.extraBold },
    backBtn: { 
        width: 64, 
        height: 64,
        borderRadius: 22,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: BRAND.colors.slate[200],
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: BRAND.colors.slate[300],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
    },
});

