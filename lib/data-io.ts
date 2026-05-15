export function exportBackup(): void {
  if (typeof window === "undefined") return;
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("ecc-")) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key)!);
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ecc-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(json: string): { imported: number; error?: string } {
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("ecc-")) {
        localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
        count++;
      }
    }
    return { imported: count };
  } catch {
    return { imported: 0, error: "Archivo JSON inválido o corrupto" };
  }
}
