import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./auth";
import { campAction, listCampCohorts } from "./shift";
import type { ShiftAction, ShiftCohort, ShiftSnapshot } from "../types/shift";

type CampContext = {
  cohorts: ShiftCohort[];
  snapshot: ShiftSnapshot | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  select: (id: string) => Promise<void>;
  act: (
    action: ShiftAction,
    payload?: Record<string, unknown>,
  ) => Promise<ShiftSnapshot>;
};
const Context = createContext<CampContext | null>(null);
export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest } = useAuth();
  const [cohorts, setCohorts] = useState<ShiftCohort[]>([]);
  const [snapshot, setSnapshot] = useState<ShiftSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selected = useRef<string | null>(null);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    if (!user || isGuest) {
      setCohorts([]);
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const list = await listCampCohorts();
      const saved =
        selected.current ??
        (await AsyncStorage.getItem(`shift-cohort:${user.id}`));
      const id = list.find((c) => c.id === saved)?.id ?? list[0]?.id;
      const next = id ? await campAction("snapshot", id) : null;
      if (request !== generation.current) return;
      selected.current = id ?? null;
      setCohorts(list);
      setSnapshot(next);
    } catch (e) {
      if (request === generation.current)
        setError(e instanceof Error ? e.message : "Could not load your camp.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [user?.id, isGuest]);
  useEffect(() => {
    selected.current = null;
    setCohorts([]);
    setSnapshot(null);
    setLoading(true);
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  const select = async (id: string) => {
    if (!user || !cohorts.some((c) => c.id === id)) return;
    const request = ++generation.current;
    setError(null);
    try {
      const next = await campAction("snapshot", id);
      if (request !== generation.current) return;
      selected.current = id;
      await AsyncStorage.setItem(`shift-cohort:${user.id}`, id);
      if (request === generation.current) setSnapshot(next);
    } catch (e) {
      if (request === generation.current)
        setError(e instanceof Error ? e.message : "Could not change camp.");
    }
  };
  const act = async (
    action: ShiftAction,
    payload: Record<string, unknown> = {},
  ) => {
    if (!snapshot) throw new Error("Choose a camp first.");
    const request = generation.current;
    const next = await campAction(action, snapshot.cohort.id, payload);
    if (request === generation.current && next.cohort.id === selected.current)
      setSnapshot(next);
    return next;
  };
  return (
    <Context.Provider
      value={{ cohorts, snapshot, loading, error, reload, select, act }}
    >
      {children}
    </Context.Provider>
  );
}
export function useShift() {
  const value = useContext(Context);
  if (!value) throw new Error("ShiftProvider required");
  return value;
}
