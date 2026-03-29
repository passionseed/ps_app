// Seed types from pseed project
import type { SeedType } from "./pathlab";

export interface SeedCategory {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface Seed {
  id: string;
  map_id: string;
  title: string;
  description: string | null;
  slogan: string | null;
  cover_image_url: string | null;
  cover_image_blurhash: string | null;
  cover_image_key: string | null;
  cover_image_updated_at: string | null;
  category_id: string | null;
  category?: SeedCategory;
  seed_type?: SeedType;
  path?: {
    id: string;
    total_days: number;
  } | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeedWithEnrollment extends Seed {
  enrollment?: {
    id: string;
    current_day: number;
    status: string;
    isDoneToday?: boolean;
  } | null;
}

export interface SeedCoverageSummary {
  activeCount: number;
  exploredCount: number;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
}

export interface SeedNpcAvatar {
  id: string;
  seed_id: string;
  name: string;
  svg_data: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
