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
  } | null;
}
