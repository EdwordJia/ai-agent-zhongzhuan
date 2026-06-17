import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { Toast } from "@douyinfe/semi-ui";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: auto attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("user_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: unwrap data envelope and handle 401
apiClient.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === "object" && "data" in payload) {
      response.data = (payload as ApiEnvelope<unknown>).data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("user_token");
      Toast.error("登录已过期，请刷新页面重新认证");
    }
    const message = error.response?.data?.message || error.message || "请求失败";
    return Promise.reject(new Error(message));
  }
);

export async function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.get(url, config);
  return response.data;
}

export async function post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.post(url, data, config);
  return response.data;
}

export async function patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await apiClient.patch(url, data, config);
  return response.data;
}

export default apiClient;
