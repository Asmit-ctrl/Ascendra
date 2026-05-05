import { describe, it, expect, beforeEach } from 'vitest';
import { CBCCurriculumAgent } from '../cbc-curriculum-agent';

describe('CBC Curriculum Agent', () => {
  let agent: CBCCurriculumAgent;

  beforeEach(() => {
    agent = new CBCCurriculumAgent();
  });

  describe('Curriculum Knowledge', () => {
    it('should provide accurate Grade 4 Mathematics learning outcomes', async () => {
      const query = 'What are the learning outcomes for Grade 4 Mathematics fractions?';
      const response = await agent.query(query, { grade: 'g4', subject: 'Mathematics' });

      expect(response.isAccurate).toBe(true);
      expect(response.source).toContain('KICD');
      expect(response.content).toContain('fraction');
      expect(response.curriculumAlignment).toBe('CBC Grade 4 Mathematics');
    });

    it('should identify curriculum-aligned vs non-aligned content', async () => {
      const alignedQuery = 'Explain fractions using parts of a whole for Grade 4';
      const nonAlignedQuery = 'Teach calculus to Grade 4 students';

      const aligned = await agent.validateCurriculumAlignment(alignedQuery, { grade: 'g4', subject: 'Mathematics' });
      const nonAligned = await agent.validateCurriculumAlignment(nonAlignedQuery, { grade: 'g4', subject: 'Mathematics' });

      expect(aligned.isAligned).toBe(true);
      expect(aligned.confidence).toBeGreaterThan(0.8);
      expect(nonAligned.isAligned).toBe(false);
      expect(nonAligned.reason).toContain('not appropriate for Grade 4');
    });

    it('should provide CBC competency mappings', async () => {
      const competencies = await agent.getCompetencies('g4', 'Mathematics', 'fractions');

      expect(competencies).toHaveLength(3);
      expect(competencies[0]).toMatchObject({
        code: expect.stringMatching(/^CBC-G4-MATH-/),
        description: expect.stringContaining('fraction'),
        level: 'Grade 4',
        subject: 'Mathematics'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown curriculum queries gracefully', async () => {
      const response = await agent.query('What is quantum physics?', { grade: 'g4', subject: 'Mathematics' });

      expect(response.isAccurate).toBe(false);
      expect(response.error).toContain('not found in CBC curriculum');
      expect(response.suggestions).toHaveLength(3);
    });

    it('should validate grade and subject combinations', async () => {
      const invalidResponse = await agent.query('Grade 15 Chemistry', { grade: 'g15', subject: 'Chemistry' });

      expect(invalidResponse.isAccurate).toBe(false);
      expect(invalidResponse.error).toContain('Invalid grade level');
    });
  });

  describe('Multi-language Support', () => {
    it('should respond in Kiswahili when requested', async () => {
      const response = await agent.query('Eleza fractions kwa Kiswahili', { 
        grade: 'g4', 
        subject: 'Mathematics',
        language: 'kiswahili'
      });

      expect(response.content).toMatch(/sehemu|fungu|mgawanyiko/);
      expect(response.language).toBe('kiswahili');
    });
  });
});