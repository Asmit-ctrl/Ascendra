import { GRADE1_COMPETENCIES } from './grade1Competencies';
import { SAMPLE_ACTIVITIES, Activity } from './sandboxActivities';

export function getCompetenciesBySubject(subject: string) {
  return GRADE1_COMPETENCIES.filter(c => c.subject.toLowerCase() === subject.toLowerCase());
}

export function findCompetency(code: string) {
  return GRADE1_COMPETENCIES.find(c => c.code === code) || null;
}

export function activitiesForCompetency(code: string): Activity[] {
  return SAMPLE_ACTIVITIES.filter(a => a.competency_codes.includes(code));
}

export function competencySummary() {
  return GRADE1_COMPETENCIES.map(c => ({ code: c.code, subject: c.subject, strand: c.strand, outcomes: c.learning_outcomes.length }));
}

export default {
  getCompetenciesBySubject,
  findCompetency,
  activitiesForCompetency,
  competencySummary
};
