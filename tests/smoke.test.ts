import { describe, it, expect } from 'vitest';
import type {
  PortfolioItemType,
  FitConfidence,
  StudentPortfolioItem,
  NewPortfolioItem,
  ProgramRequirements,
  ProgramFitScore,
  FitScoreResult,
  FitGap,
} from '../types/portfolio';

describe('portfolio types', () => {
  it('PortfolioItemType accepts valid values', () => {
    const types: PortfolioItemType[] = ['project', 'award', 'activity', 'course', 'other'];
    expect(types).toHaveLength(5);
  });

  it('FitConfidence accepts valid values', () => {
    const levels: FitConfidence[] = ['low', 'medium', 'high'];
    expect(levels).toHaveLength(3);
  });

  it('NewPortfolioItem can be constructed with minimal fields', () => {
    const item: NewPortfolioItem = {
      item_type: 'project',
      title: 'My Project',
    };
    expect(item.item_type).toBe('project');
    expect(item.title).toBe('My Project');
    expect(item.description).toBeUndefined();
  });

  it('FitGap has required fields', () => {
    const gap: FitGap = {
      gap: 'community impact',
      suggestion: 'Add volunteer work',
    };
    expect(gap.gap).toBeTruthy();
    expect(gap.suggestion).toBeTruthy();
  });

  it('StudentPortfolioItem has all required fields', () => {
    const item: StudentPortfolioItem = {
      id: '123',
      user_id: '456',
      item_type: 'award',
      title: 'Science Fair',
      description: null,
      date_from: null,
      date_to: null,
      tags: ['science'],
      embedding: null,
      source: 'manual',
      pathlab_journey_id: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(item.id).toBe('123');
    expect(item.source).toBe('manual');
  });

  it('ProgramFitScore has score constraints conceptually', () => {
    const score: ProgramFitScore = {
      id: 'abc',
      user_id: 'user1',
      round_id: 'round1',
      program_id: 'prog1',
      eligibility_pass: true,
      fit_score: 85,
      confidence: 'high',
      narrative: 'Great fit',
      gaps: null,
      portfolio_snapshot: null,
      scored_at: '2026-01-01T00:00:00Z',
      score_version: 1,
    };
    expect(score.fit_score).toBeGreaterThanOrEqual(0);
    expect(score.fit_score).toBeLessThanOrEqual(100);
  });
});
