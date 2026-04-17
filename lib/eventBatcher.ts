import { supabase } from './supabase';
import { getItem, setItem } from './asyncStorage';
import type { EventType, EventDataMap } from '../types/events';

const BATCH_KEY = '@event_batch';
const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 30000;
const MAX_RETRIES = 3;

interface QueuedEvent<K extends keyof EventDataMap = keyof EventDataMap> {
  eventType: K;
  eventData: EventDataMap[K];
  timestamp: number;
  retries: number;
}

interface EventBatch {
  events: QueuedEvent[];
  lastFlushAttempt: number;
}

class EventBatcher {
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private pendingFlush: Promise<void> | null = null;

  constructor() {
    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flushIfNeeded();
    }, FLUSH_INTERVAL_MS);
  }

  async queueEvent<K extends keyof EventDataMap>(
    eventType: K,
    eventData: EventDataMap[K]
  ): Promise<void> {
    try {
      const batch = await this.getBatch();
      const event: QueuedEvent<K> = {
        eventType,
        eventData,
        timestamp: Date.now(),
        retries: 0,
      };

      batch.events.push(event);

      if (batch.events.length >= BATCH_SIZE) {
        await this.flush();
      } else {
        await this.saveBatch(batch);
      }
    } catch (error) {
      console.error('[EventBatcher] Failed to queue event:', error);
    }
  }

  private async getBatch(): Promise<EventBatch> {
    try {
      const stored = await getItem(BATCH_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Failed to parse, start fresh
    }
    return { events: [], lastFlushAttempt: 0 };
  }

  private async saveBatch(batch: EventBatch): Promise<void> {
    try {
      await setItem(BATCH_KEY, JSON.stringify(batch));
    } catch (error) {
      console.error('[EventBatcher] Failed to save batch:', error);
    }
  }

  private async flushIfNeeded(): Promise<void> {
    const batch = await this.getBatch();
    if (batch.events.length > 0) {
      const timeSinceLastFlush = Date.now() - batch.lastFlushAttempt;
      if (timeSinceLastFlush >= FLUSH_INTERVAL_MS) {
        await this.flush();
      }
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing) {
      return this.pendingFlush ?? Promise.resolve();
    }

    this.isFlushing = true;
    this.pendingFlush = this.performFlush();

    try {
      await this.pendingFlush;
    } finally {
      this.isFlushing = false;
      this.pendingFlush = null;
    }
  }

  private async performFlush(): Promise<void> {
    const batch = await this.getBatch();
    if (batch.events.length === 0) {
      return;
    }

    batch.lastFlushAttempt = Date.now();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Can't flush without a user, save for later
        await this.saveBatch(batch);
        return;
      }

      const sessionId = await this.getOrCreateSessionId();

      const eventsToInsert = batch.events.map((event) => ({
        user_id: user.id,
        event_type: event.eventType,
        event_data: event.eventData,
        session_id: sessionId,
        created_at: new Date(event.timestamp).toISOString(),
      }));

      const { error } = await supabase.from('user_events').insert(eventsToInsert);

      if (error) {
        throw error;
      }

      // Clear the batch on success
      batch.events = [];
      await this.saveBatch(batch);
    } catch (error) {
      console.error('[EventBatcher] Flush failed:', error);

      // Retry logic: increment retries and keep failed events
      const retryableEvents = batch.events
        .map((e) => ({ ...e, retries: e.retries + 1 }))
        .filter((e) => e.retries < MAX_RETRIES);

      if (retryableEvents.length === 0) {
        // All events exceeded max retries, drop them
        batch.events = [];
      } else {
        batch.events = retryableEvents;
      }

      await this.saveBatch(batch);
    }
  }

  private async getOrCreateSessionId(): Promise<string> {
    const SESSION_KEY = '@batch_session_id';
    const SESSION_TS_KEY = '@batch_session_ts';
    const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

    try {
      const [stored, ts] = await Promise.all([
        getItem(SESSION_KEY),
        getItem(SESSION_TS_KEY),
      ]);

      if (stored && ts && Date.now() - parseInt(ts, 10) < SESSION_TTL_MS) {
        return stored;
      }

      const newId = this.generateUUID();
      await Promise.all([
        setItem(SESSION_KEY, newId),
        setItem(SESSION_TS_KEY, Date.now().toString()),
      ]);
      return newId;
    } catch {
      return this.generateUUID();
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// Singleton instance
let batcherInstance: EventBatcher | null = null;

export function getEventBatcher(): EventBatcher {
  if (!batcherInstance) {
    batcherInstance = new EventBatcher();
  }
  return batcherInstance;
}

export async function queueEvent<K extends keyof EventDataMap>(
  eventType: K,
  eventData: EventDataMap[K]
): Promise<void> {
  const batcher = getEventBatcher();
  await batcher.queueEvent(eventType, eventData);
}

export async function flushEvents(): Promise<void> {
  const batcher = getEventBatcher();
  await batcher.flush();
}

export function destroyEventBatcher(): void {
  if (batcherInstance) {
    batcherInstance.destroy();
    batcherInstance = null;
  }
}
