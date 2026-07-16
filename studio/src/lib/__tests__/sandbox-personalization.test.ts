import { describe, expect, it } from 'vitest';
import { buildFallbackPrompt, inferAdaptiveProfile, personalizePrompt } from '../sandbox-personalization';

describe('sandbox personalization', () => {
  it('tunes questions to a more supportive style for early learners', () => {
    const profile = inferAdaptiveProfile('g2', 1, 0, 0.4);
    const prompt = personalizePrompt('Which sentence is correct?', 'english', 'g2', 1, profile);

    expect(profile.level).toBe('support');
    expect(prompt).toContain('Choose the best answer');
    expect(prompt).toContain('Grade 2');
  });

  it('uses a more analytical prompt for confident learners', () => {
    const profile = inferAdaptiveProfile('g5', 4, 3, 0.9);
    const prompt = personalizePrompt('Which sentence is correct?', 'english', 'g5', 4, profile);

    expect(profile.level).toBe('challenge');
    expect(prompt).toContain('most accurate response');
  });

  it('uses Kiswahili phrasing for Kiswahili activities', () => {
    const prompt = personalizePrompt('Ni neno gani lina sauti /ny/ na /ng/ kwenye silabi zake?', 'kiswahili', 'g2', 1);

    expect(prompt).toContain('Chagua jibu sahihi');
  });

  it('uses a broader fallback for pronunciation-style English objectives', () => {
    const prompt = buildFallbackPrompt('english', 'pronunciation', 'g2', 1);

    expect(prompt).toContain('sound');
  });

  it('uses a broader fallback for environmental hygiene objectives', () => {
    const prompt = buildFallbackPrompt('environmental', 'hygiene', 'g2', 1);

    expect(prompt).toContain('health');
  });
});
