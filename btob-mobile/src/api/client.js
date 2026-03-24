import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your machine's local IP address if testing on a physical device,
// otherwise localhost or 10.0.2.2 (for Android Emulators) works.
// Using 10.0.2.2 assumes Android Emulator connecting to Django on local machine.
export const BASE_URL = 'http://192.168.8.125:8000/api';

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor to add JWT token
client.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error fetching token from storage', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default client;
