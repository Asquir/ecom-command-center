"use client";
import { createContext, useContext, ReactNode } from "react";
import { useLocalStorage } from "./hooks";

export interface AppSettings {
  currency: string;
  country: string;
  timezone: string;
  aov: number;
  margin: number;
  beCpa: number;
  beRoas: number;
  ctrTarget: number;
  cpcMax: number;
  hookTarget: number;
  pixelId: string;
  shopifyUrl: string;
  notifyKill: boolean;
  notifyScale: boolean;
  notifyPrimeTime: boolean;
  autoReport: boolean;
  productName: string;
  productCost: number;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: "EUR", country: "MX", timezone: "America/Mexico_City",
  aov: 0, margin: 0, beCpa: 0, beRoas: 0,
  ctrTarget: 2, cpcMax: 0.6, hookTarget: 35,
  pixelId: "", shopifyUrl: "",
  notifyKill: true, notifyScale: true, notifyPrimeTime: true, autoReport: false,
  productName: "", productCost: 0, onboarded: false,
};

interface SettingsCtx {
  settings: AppSettings;
  setSettings: (s: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
}

const Ctx = createContext<SettingsCtx>({ settings: DEFAULT_SETTINGS, setSettings: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<AppSettings>("ecc-settings", DEFAULT_SETTINGS);
  return <Ctx.Provider value={{ settings, setSettings }}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
