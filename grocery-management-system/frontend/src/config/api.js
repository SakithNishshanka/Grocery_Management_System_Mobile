import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const normalizeServerUrl = (value) => value?.replace(/\/$/, '') || null;

/**
 * Expo Go / Metro exposes the dev machine IP via debuggerHost (e.g. "10.38.245.35:8081").
 * This is the most reliable URL when testing on a physical phone.
 */
const getExpoDevMachineUrl = () => {
  const raw =
    Constants.expoGoConfig?.debuggerHost ||
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (!raw) return null;

  const hostname = String(raw).split(':')[0];
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  return `http://${hostname}:5000`;
};

const getConfiguredUrl = () =>
  normalizeServerUrl(
    Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL
  );

const getPlatformFallbackUrl = () => {
  if (Platform.OS === 'android') {
    // 10.0.2.2 only works on the Android emulator, not on a real device.
    return 'http://10.95.77.35:5000';
  }
  return 'http://localhost:5000';
};

const buildCandidateServerUrls = () => {
  const expoDevUrl = getExpoDevMachineUrl();
  const configuredUrl = getConfiguredUrl();
  const platformFallback = getPlatformFallbackUrl();

  // Prefer Expo-detected LAN IP first (physical phone + Expo Go).
  const urls = [expoDevUrl, configuredUrl, platformFallback].filter(Boolean);
  return [...new Set(urls)];
};

export const candidateServerUrls = buildCandidateServerUrls();
let activeServerUrl = candidateServerUrls[0];
export const getServerUrl = () => activeServerUrl;
export const SERVER_URL = activeServerUrl;

const setActiveServerUrl = (serverUrl) => {
  if (!serverUrl || serverUrl === activeServerUrl) return;

  activeServerUrl = serverUrl;
  api.defaults.baseURL = `${serverUrl}/api`;

  if (__DEV__) {
    console.log('[API] Connected backend:', api.defaults.baseURL);
  }
};

const getServerUrlFromBaseUrl = (baseURL) =>
  normalizeServerUrl(String(baseURL || '').replace(/\/api$/, ''));

const BASE_URL = `${activeServerUrl}/api`;

if (__DEV__) {
  console.log('[API] Candidate server URLs:', candidateServerUrls);
  console.log('[API] Using:', BASE_URL);
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

api.interceptors.response.use(
  (response) => {
    const serverUrl = getServerUrlFromBaseUrl(response.config?.baseURL);
    setActiveServerUrl(serverUrl);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isNetworkError = !error.response;

    if (!originalRequest || !isNetworkError) {
      return Promise.reject(error);
    }

    const failedServerUrl = getServerUrlFromBaseUrl(originalRequest.baseURL || api.defaults.baseURL);
    const failedIndex = candidateServerUrls.indexOf(failedServerUrl);
    const retryIndex = originalRequest.__serverUrlRetryIndex ?? Math.max(failedIndex, 0);
    const nextServerUrl = candidateServerUrls[retryIndex + 1];

    if (!nextServerUrl) {
      return Promise.reject(error);
    }

    originalRequest.__serverUrlRetryIndex = retryIndex + 1;
    originalRequest.baseURL = `${nextServerUrl}/api`;

    if (__DEV__) {
      console.log('[API] Retrying with:', originalRequest.baseURL);
    }

    return api.request(originalRequest);
  }
);

api.interceptors.request.use(
  async (config) => {
    config.baseURL = config.baseURL || `${activeServerUrl}/api`;

    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getImageUri = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  return `${activeServerUrl}${imageUrl}`;
};

export default api;
