import { create } from "zustand";
import { post, get } from "../services/apiService";
import { Toast } from "@douyinfe/semi-ui";

export interface UserState {
  machineId: string | null;
  token: string | null;
  points: number;
  freeDailyUsed: number;
  freeDailyLimit: number;
  isAuthenticated: boolean;
  isLoading: boolean;

  initMachine: () => void;
  authMachine: () => Promise<void>;
  refreshPoints: () => Promise<void>;
  redeemCode: (code: string) => Promise<boolean>;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateMachineId(): string {
  const stored = localStorage.getItem("machine_id");
  if (stored) return stored;
  const newId = generateUUID();
  localStorage.setItem("machine_id", newId);
  return newId;
}

export const useUserStore = create<UserState>((set, getStore) => ({
  machineId: null,
  token: localStorage.getItem("user_token"),
  points: 0,
  freeDailyUsed: 0,
  freeDailyLimit: 3,
  isAuthenticated: false,
  isLoading: false,

  initMachine: () => {
    const machineId = getOrCreateMachineId();
    set({ machineId });
  },

  authMachine: async () => {
    const { machineId } = getStore();
    if (!machineId) return;

    set({ isLoading: true });
    try {
      const response = await post<{
        token: string;
        user: { points: number; free_daily_count: number };
      }>("/auth/machine", { machine_id: machineId });
      localStorage.setItem("user_token", response.token);
      set({
        token: response.token,
        points: response.user.points ?? 0,
        freeDailyUsed: response.user.free_daily_count ?? 0,
        freeDailyLimit: 5,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "认证失败";
      if (msg.includes("Network Error") || msg.includes("ECONNREFUSED")) {
        Toast.error("后端服务未启动，部分功能不可用");
      } else {
        Toast.error("认证失败: " + msg);
      }
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  refreshPoints: async () => {
    const { isAuthenticated } = getStore();
    if (!isAuthenticated) return;

    try {
      const response = await get<{ points: number; free_daily_used: number; free_daily_limit: number }>(
        "/user/points"
      );
      set({
        points: response.points ?? 0,
        freeDailyUsed: response.free_daily_used ?? 0,
        freeDailyLimit: response.free_daily_limit ?? 5,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Network Error") || msg.includes("ECONNREFUSED")) {
        Toast.error("后端服务未启动，无法刷新积分");
      } else {
        Toast.error("刷新积分失败: " + msg);
      }
    }
  },

  redeemCode: async (code: string) => {
    const { isAuthenticated } = getStore();
    if (!isAuthenticated) {
      Toast.error("请先等待认证完成");
      return false;
    }
    if (!code.trim()) {
      Toast.warning("请输入兑换码");
      return false;
    }

    try {
      const response = await post<{ points: number; pointsAfter: number }>("/user/redeem", {
        code: code.trim(),
      });
      set({ points: response.pointsAfter ?? 0 });
      Toast.success(`兑换成功，新增 ${response.points ?? 0} 积分`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "兑换失败";
      Toast.error("兑换码验证失败: " + msg);
      return false;
    }
  },
}));
