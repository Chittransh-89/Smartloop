import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Dataset } from "@/lib/types";
import { generateDataset, randomSeed } from "@/lib/simulation";

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: "success" | "info" | "error";
}

interface DataContextValue {
  dataset: Dataset;
  seed: string;
  loading: boolean;
  error: string | null;
  rangeDays: number;
  setRangeDays: (days: number) => void;
  regenerate: () => void;
  resetDemo: () => void;
  acknowledged: Set<string>;
  acknowledge: (id: string) => void;
  acknowledgeMany: (ids: string[]) => void;
  isAcknowledged: (id: string) => boolean;
  activeAlertCount: number;
  toast: ToastMessage | null;
  dismissToast: () => void;
  notify: (title: string, description?: string, tone?: ToastMessage["tone"]) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const DEFAULT_SEED = "smartloop-demo-v1";

export function DataProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [dataset, setDataset] = useState<Dataset>(() => generateDataset(DEFAULT_SEED));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(7);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimer = useRef<number | null>(null);
  const regenerateTimer = useRef<number | null>(null);

  const notify = useCallback(
    (title: string, description?: string, tone: ToastMessage["tone"] = "success") => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      const id = Date.now();
      setToast({ id, title, description, tone });
      toastTimer.current = window.setTimeout(() => setToast(null), 4200);
    },
    [],
  );

  const dismissToast = useCallback(() => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const regenerate = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setError(null);
    if (regenerateTimer.current) window.clearTimeout(regenerateTimer.current);
    regenerateTimer.current = window.setTimeout(() => {
      const nextSeed = randomSeed();
      try {
        const next = generateDataset(nextSeed);
        setSeed(nextSeed);
        setDataset(next);
        setAcknowledged(new Set());
        setLoading(false);
        notify(
          "Demo dataset regenerated",
          "All charts, alerts and forecasts now use the new simulated dataset.",
          "success",
        );
      } catch {
        setLoading(false);
        setError("The demo dataset could not be generated. Please retry.");
        notify("Could not regenerate data", "The previous dataset is still displayed.", "error");
      }
    }, 700);
  }, [loading, notify]);

  const resetDemo = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setError(null);
    if (regenerateTimer.current) window.clearTimeout(regenerateTimer.current);
    regenerateTimer.current = window.setTimeout(() => {
      try {
        const next = generateDataset(DEFAULT_SEED);
        setSeed(DEFAULT_SEED);
        setDataset(next);
        setAcknowledged(new Set());
        setRangeDays(7);
        setLoading(false);
        notify("Demo reset", "The original simulated dataset and alert states are restored.", "info");
      } catch {
        setLoading(false);
        setError("The demo dataset could not be reset. Please reload the page.");
      }
    }, 500);
  }, [loading, notify]);

  const acknowledge = useCallback(
    (id: string) => {
      setAcknowledged((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      notify("Alert acknowledged", "It stays in the log with an acknowledged status.");
    },
    [notify],
  );

  const acknowledgeMany = useCallback(
    (ids: string[]) => {
      setAcknowledged((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      notify(
        ids.length === 1 ? "Alert acknowledged" : `${ids.length} alerts acknowledged`,
        "The alert log was updated for this demo session.",
      );
    },
    [notify],
  );

  const isAcknowledged = useCallback(
    (id: string) => {
      const alert = dataset.alerts.find((a) => a.id === id);
      return Boolean(alert?.status === "acknowledged" || acknowledged.has(id));
    },
    [acknowledged, dataset.alerts],
  );

  const activeAlertCount = useMemo(
    () =>
      dataset.alerts.filter(
        (alert) => alert.status === "active" && !acknowledged.has(alert.id),
      ).length,
    [acknowledged, dataset.alerts],
  );

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (regenerateTimer.current) window.clearTimeout(regenerateTimer.current);
    },
    [],
  );

  const value: DataContextValue = {
    dataset,
    seed,
    loading,
    error,
    rangeDays,
    setRangeDays,
    regenerate,
    resetDemo,
    acknowledged,
    acknowledge,
    acknowledgeMany,
    isAcknowledged,
    activeAlertCount,
    toast,
    dismissToast,
    notify,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
