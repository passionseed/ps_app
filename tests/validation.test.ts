import { describe, it, expect } from 'vitest';
import { checkObjectiveAlignment } from '../scripts/generate-pathlab/validation/checks/objective-alignment';
import { checkEvidenceCoverage } from '../scripts/generate-pathlab/validation/checks/evidence-coverage';
import { checkContentRelevance } from '../scripts/generate-pathlab/validation/checks/content-relevance';
import { checkActivityFlow } from '../scripts/generate-pathlab/validation/checks/activity-flow';
import { LearningOutput, ExpertProfile } from '../scripts/generate-pathlab/types';

const mockExpertProfile: ExpertProfile = {
  id: 'test-id',
  name: 'Test Expert',
  title: 'Software Engineer',
  company: 'Test Co',
  field_category: 'Technology',
  interview_data: {
    role: 'Engineer',
    field: 'Technology',
    advice: 'Test advice',
    skills: { soft: [], technical: ['coding'], hardToDevelop: [] },
    challenges: ['debugging'],
    dailyTasks: ['coding'],
    careerTruths: {
      mostImportant: ['learning'],
      hiddenChallenges: [],
      rewardingMoments: [],
      mundaneButRequired: [],
      noviceToExpertShifts: [],
      beginnersUnderestimate: []
    }
  },
  interview_transcript: []
};

describe('Validation Checks', () => {
  describe('checkObjectiveAlignment', () => {
    it('should fail when no activities exist', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test context',
        activities: []
      }];

      const issues = await checkObjectiveAlignment({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe('critical');
    });

    it('should pass with valid activities', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test context',
        activities: [{
          title: 'Learn',
          activityType: 'learning',
          instructions: 'Read this',
          displayOrder: 1,
          content: [{
            contentType: 'text',
            contentTitle: 'Content',
            contentBody: 'Some content here'
          }]
        }]
      }];

      const issues = await checkObjectiveAlignment({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.filter(i => i.severity === 'critical')).toHaveLength(0);
    });
  });

  describe('checkEvidenceCoverage', () => {
    it('should warn when no reflection activities exist', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test context with enough text to pass',
        activities: [{
          title: 'Learn',
          activityType: 'learning',
          instructions: 'Read',
          displayOrder: 1,
          content: []
        }]
      }];

      const issues = await checkEvidenceCoverage({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.some(i => i.issue.includes('No reflection'))).toBe(true);
    });
  });

  describe('checkContentRelevance', () => {
    it('should fail on placeholder text', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test',
        activities: [{
          title: 'Learn',
          activityType: 'learning',
          instructions: 'Read',
          displayOrder: 1,
          content: [{
            contentType: 'text',
            contentTitle: 'Content',
            contentBody: '[insert content here]'
          }]
        }]
      }];

      const issues = await checkContentRelevance({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.some(i => i.issue.includes('placeholder'))).toBe(true);
    });
  });

  describe('checkActivityFlow', () => {
    it('should warn when day ends with learning activity', async () => {
      const learning: LearningOutput[] = [{
        dayNumber: 1,
        contextText: 'Test',
        activities: [
          {
            title: 'Learn',
            activityType: 'learning',
            instructions: 'Read',
            displayOrder: 1,
            content: []
          },
          {
            title: 'Learn More',
            activityType: 'learning',
            instructions: 'Read more',
            displayOrder: 2,
            content: []
          }
        ]
      }];

      const issues = await checkActivityFlow({
        expertProfile: mockExpertProfile,
        learning
      });

      expect(issues.some(i => i.issue.includes('ends with a learning'))).toBe(true);
    });
  });
});
