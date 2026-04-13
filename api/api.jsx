import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = "http://192.168.1.229:8000/api";

const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  timeout: 15000,
  transformResponse: [(data) => {
    try { return JSON.parse(data); } catch { return data; }
  }],
});

API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem("refresh_token");
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }
          });
          const newToken = res.data.access_token;
          await AsyncStorage.setItem("token", newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return API(originalRequest);
        }
      } catch (_) {}
    }
    return Promise.reject(error);
  }
);

export default API;