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
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: "EUR", country: "MX", timezone: "America/Mexico_City",
  aov: 39, margin: 22.5, beCpa: 17, beRoas: 2.3,
  ctrTarget: 2, cpcMax: 0.6, hookTarget: 35,
  pixelId: "4827391048", shopifyUrl: "reviari.myshopify.com",
  notifyKill: true, notifyScale: true, notifyPrimeTime: true, autoReport: false,
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
