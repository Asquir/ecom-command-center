"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocalStorage } from "./hooks";
import { getCachedStatus, verifyLicense, type Plan } from "./license";

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
  monthlyAdsBudget: number;
  notifyKill: boolean;
  notifyScale: boolean;
  notifyPrimeTime: boolean;
  autoReport: boolean;
  productName: string;
  productCost: number;
  onboarded: boolean;
  userName: string;
  userEmail: string;
  storeName: string;
  licenseKey: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: "EUR", country: "MX", timezone: "America/Mexico_City",
  aov: 0, margin: 0, beCpa: 0, beRoas: 0,
  ctrTarget: 2, cpcMax: 0.6, hookTarget: 35,
  pixelId: "", shopifyUrl: "",
  monthlyAdsBudget: 0,
  notifyKill: true, notifyScale: true, notifyPrimeTime: true, autoReport: false,
  productName: "", productCost: 0, onboarded: false,
  userName: "", userEmail: "", storeName: "",
  licenseKey: "",
};

interface SettingsCtx {
  settings: AppSettings;
  setSettings: (s: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  plan: Plan;
  isPro: boolean;
  licenseChecking: boolean;
  refreshLicense: () => Promise<void>;
}

const Ctx = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
  plan: "free",
  isPro: false,
  licenseChecking: false,
  refreshLicense: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<AppSettings>("ecc-settings", DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<Plan>("free");
  const [licenseChecking, setLicenseChecking] = useState(false);

  const refreshLicense = async () => {
    if (!settings.licenseKey) {
      setPlan("free");
      return;
    }
    setLicenseChecking(true);
    try {
      const status = await verifyLicense(settings.licenseKey);
      setPlan(status.valid ? status.plan : "free");
    } finally {
      setLicenseChecking(false);
    }
  };

  // On mount: read cached status (instant), then refresh in background
  useEffect(() => {
    if (!settings.licenseKey) { setPlan("free"); return; }
    const cached = getCachedStatus(settings.licenseKey);
    setPlan(cached.valid ? cached.plan : "free");
    void refreshLicense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.licenseKey]);

  const isPro = plan === "pro";

  return (
    <Ctx.Provider value={{ settings, setSettings, plan, isPro, licenseChecking, refreshLicense }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() {
  return useContext(Ctx);
}
