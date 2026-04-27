import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your machine's local IP address if testing on a physical device,
// otherwise localhost or 10.0.2.2 (for Android Emulators) works.
// Using 10.0.2.2 assumes Android Emulator connecting to Django on local machine.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.8.125:8000/api';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 60000, // 60 seconds - tuned for Yemeni network conditions
    headers: {
        'Content-Type': 'application/json',
    },
});

// Listener mechanism for global notifications
let notificationListener = null;
export const setNotificationListener = (callback) => {
    notificationListener = callback;
};

/**
 * Trigger a global notification from anywhere (screens or background services).
 * @param {Object} config - { title, message, type, isNetworkError }
 */
export const notify = (config) => {
    if (notificationListener) {
        notificationListener(config);
    }
};

// Callback for payment required (402)
let unauthorizedHandler = null;
let paymentRequiredHandler = null;

export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

export const setPaymentRequiredHandler = (handler) => {
    paymentRequiredHandler = handler;
};

// Request Interceptor to add JWT token and Active Supplier ID
client.interceptors.request.use(
    async (config) => {
        try {
            // 1. Add JWT Token
            const token = await AsyncStorage.getItem('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // 2. Add Active Supplier ID (for multi-tenant context)
            const scope = await AsyncStorage.getItem('user_scope');
            if (scope === 'merchant' || scope === 'driver') {
                const merchant = await AsyncStorage.getItem('active_merchant');
                if (merchant && merchant !== 'null') {
                    try {
                        const parsed = JSON.parse(merchant);
                        if (parsed && parsed.id) {
                            config.headers['X-Supplier-ID'] = parsed.id;
                        }
                    } catch (e) {
                        // Ignore parse errors for active_merchant
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching context from storage', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


// Response Interceptor for advanced error handling
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { response, code, config } = error;

        // --- RETRY LOGIC FOR IDEMPOTENT REQUESTS ---
        // If it's a GET request and we haven't reached max retries, try again
        // especially useful for poor network conditions in Yemen.
        const MAX_RETRIES = 2;
        config.retryCount = config.retryCount || 0;

        if (
            config.method === 'get' &&
            config.retryCount < MAX_RETRIES &&
            (code === 'ECONNABORTED' || !response)
        ) {
            config.retryCount += 1;
            console.log(`Retrying GET request (${config.retryCount}/${MAX_RETRIES})...`);

            // Wait a bit before retrying (exponential backoff)
            const delay = 1000 * config.retryCount;
            await new Promise(resolve => setTimeout(resolve, delay));

            return client(config);
        }
        // ------------------------------------------

        // 1. Handle 401 Unauthorized
        if (response && response.status === 401) {
            console.log('Unauthorized request detected (401)');
            
            // Skip global logout notification if this was a login attempt
            const isAuthEndpoint = config.url && (config.url.includes('/auth/login/') || config.url.includes('/auth/unified-login/'));
            
            if (!isAuthEndpoint && unauthorizedHandler) {
                unauthorizedHandler();
            }
            
            return Promise.reject(error);
        }

        // 2. Handle 402 Payment Required (Subscription Expired)
        if (response && response.status === 402) {
            console.log('Payment Required (Subscription Expired) detected (402)');
            if (paymentRequiredHandler) paymentRequiredHandler(response.data);
            return Promise.reject(error);
        }

        // 3. Prepare Error Details for UI
        let errorInfo = {
            title: 'خطأ',
            message: 'حدث خطأ غير متوقع',
            type: 'error',
            isNetworkError: false,
        };

        if (code === 'ECONNABORTED') {
            errorInfo = {
                title: 'انتهاء المهلة',
                message: 'اتصال الإنترنت بطيء جداً، يرجى المحاولة مرة أخرى',
                type: 'warning',
                isNetworkError: true,
            };
        } else if (!response) {
            errorInfo = {
                title: 'لا يوجد اتصال',
                message: 'يرجى التحقق من اتصالك بالإنترنت والعملية في اليمن',
                type: 'error',
                isNetworkError: true,
            };
        } else if (response.status >= 500) {
            errorInfo = {
                title: 'خطأ في الخادم',
                message: 'نواجه مشكلة في السيرفر حالياً، يرجى المحاولة لاحقاً',
                type: 'error',
                isNetworkError: false,
            };
        } else if (response.status === 400) {
            // Standard validation errors
            const msg = response.data?.message || response.data?.detail || 'يرجى التأكد من البيانات المدخلة';
            errorInfo = {
                title: 'خطأ في البيانات',
                message: msg,
                type: 'warning',
                isNetworkError: false,
            };
        }

        // 3. Notify Global UI if listener is attached
        if (notificationListener) {
            notificationListener(errorInfo);
        }

        return Promise.reject(error);
    }
);

client.getAuthMerchantId = async () => {
    try {
        const merchant = await AsyncStorage.getItem('active_merchant');
        if (merchant) {
            const parsed = JSON.parse(merchant);
            return parsed.id;
        }
    } catch (e) {
        console.error('Error getting active merchant ID', e);
    }
    return null;
};

// --- Attach named exports for simpler access from defaults ---
client.notify = notify;
client.setNotificationListener = setNotificationListener;
client.setUnauthorizedHandler = setUnauthorizedHandler;
client.setPaymentRequiredHandler = setPaymentRequiredHandler;


export default client;

