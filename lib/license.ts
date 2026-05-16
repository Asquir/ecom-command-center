"use client";

const LICENSE_CACHE_KEY = "ecc-license";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;     // 24h fresh
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7d offline grace

export type Plan = "free" | "pro";

export interface LicenseStatus {
  valid: boolean;
  plan: Plan;
  expiresAt: number | null;
  cachedAt: number;
  source: "remote" | "cache" | "grace" | "empty";
  error?: string;
}

interface CachedLicense {
  key: string;
  valid: boolean;
  plan: Plan;
  expiresAt: number | null;
  cachedAt: number;
}

const WORKER_ENDPOINT = process.env.NEXT_PUBLIC_LICENSE_ENDPOINT
  ?? "https://ecc-license.workers.dev/verify";

// Hardcoded owner key — works without deploying the Worker
const OWNER_KEYS = ["ECC-4M2DFMG9KF7V6Y9TIC"];
// Additional keys from env (Vercel dashboard)
const MASTER_KEY = process.env.NEXT_PUBLIC_MASTER_LICENSE_KEY ?? "";

function readCache(): CachedLicense | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LICENSE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedLicense) : null;
  } catch { return null; }
}

function writeCache(c: CachedLicense) {
  try { localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(c)); } catch {}
}

export function clearLicenseCache() {
  try { localStorage.removeItem(LICENSE_CACHE_KEY); } catch {}
}

export async function verifyLicense(key: string, force = false): Promise<LicenseStatus> {
  const k = key.trim();
  if (!k) {
    clearLicenseCache();
    return { valid: false, plan: "free", expiresAt: null, cachedAt: Date.now(), source: "empty" };
  }

  // Owner bypass — validated locally, no Worker call needed
  if (OWNER_KEYS.includes(k) || (MASTER_KEY && k === MASTER_KEY)) {
    const result: CachedLicense = { key: k, valid: true, plan: "pro", expiresAt: null, cachedAt: Date.now() };
    writeCache(result);
    return { ...result, source: "remote" };
  }

  const cache = readCache();
  const now = Date.now();
  const cacheIsFresh = cache && cache.key === k && (now - cache.cachedAt) < CACHE_TTL_MS;

  if (!force && cacheIsFresh) {
    return {
      valid: cache!.valid,
      plan: cache!.plan,
      expiresAt: cache!.expiresAt,
      cachedAt: cache!.cachedAt,
      source: "cache",
    };
  }

  try {
    const res = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: k }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { valid: boolean; plan?: Plan; expiresAt?: number | null };
    const result: CachedLicense = {
      key: k,
      valid: !!data.valid,
      plan: data.plan ?? "free",
      expiresAt: data.expiresAt ?? null,
      cachedAt: now,
    };
    writeCache(result);
    return { ...result, source: "remote" };
  } catch (err) {
    // Network failure: fall back to cache if within grace period
    if (cache && cache.key === k && (now - cache.cachedAt) < GRACE_PERIOD_MS) {
      return {
        valid: cache.valid,
        plan: cache.plan,
        expiresAt: cache.expiresAt,
        cachedAt: cache.cachedAt,
        source: "grace",
      };
    }
    return {
      valid: false, plan: "free", expiresAt: null, cachedAt: now,
      source: "empty", error: err instanceof Error ? err.message : "verification failed",
    };
  }
}

export function getCachedStatus(licenseKey: string): LicenseStatus {
  const cache = readCache();
  const now = Date.now();
  if (!cache || cache.key !== licenseKey.trim()) {
    return { valid: false, plan: "free", expiresAt: null, cachedAt: now, source: "empty" };
  }
  const age = now - cache.cachedAt;
  const stillValid = age < GRACE_PERIOD_MS;
  return {
    valid: stillValid && cache.valid,
    plan: stillValid ? cache.plan : "free",
    expiresAt: cache.expiresAt,
    cachedAt: cache.cachedAt,
    source: age < CACHE_TTL_MS ? "cache" : "grace",
  };
}
