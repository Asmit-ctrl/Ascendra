import { describe, expect, it } from 'vitest';
import { generateQuestionsFromCurriculum } from '../curriculum-activities-mapper';

describe('generateQuestionsFromCurriculum', () => {
  it('creates Kiswahili questions for -ako and -enu usage instead of the unrelated /p/ sound topic', () => {
    const questions = generateQuestionsFromCurriculum(
      {
        learning_outcomes: ['kutambua matumizi yafaayo ya -ako na -enu katika kifungu'],
        suggested_activities: [
          'kutambua matumizi ya -ako na -enu katika kadi za maneno',
        ],
        key_inquiry_questions: ['Je,-ako na -enu hutumiwa wakati gani?'],
      },
      'kiswahili',
    );

    expect(questions[0]?.question).toContain('-ako');
    expect(questions[0]?.question).toContain('-enu');
    expect(questions[0]?.question).toContain('matumizi');
    expect(questions[0]?.options.join(' ')).toContain('nyumba yenu');
    expect(questions[0]?.hint).toContain('umiliki');
  });

  it('uses the Kiswahili prompt style for curriculum-generated Kiswahili questions', () => {
    const questions = generateQuestionsFromCurriculum(
      {
        learning_outcomes: ['kutambua sauti ya /ny/ na /ng/'],
        suggested_activities: ['kutambua sauti lengwa katika silabi'],
        key_inquiry_questions: ['Ni neno gani lina sauti /ny/ na /ng/?'],
      },
      'kiswahili',
    );

    expect(questions[0]?.question).toContain('Chagua jibu sahihi');
  });
});
