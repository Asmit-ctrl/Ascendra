/**
 * Learning Paths System
 *
 * Defines structured learning sequences aligned to CBC curriculum.
 * Students follow guided paths that build competencies sequentially.
 *
 * Each path has:
 * - Clear learning objectives (CBC competencies)
 * - Prerequisite topics
 * - Recommended progression
 * - Estimated time to complete
 * - Validation checkpoints (mini-quizzes)
 */

export interface LearningCheckpoint {
  competencyCode: string;
  competencyName: string;
  description: string;
  suggestedDuration: number; // minutes
  estimatedQuestions: number;
  validateBefore: string[]; // other competencies to master first
}

export interface LearningPath {
  id: string;
  subject: string;
  grade: string;
  pathName: string;
  description: string;
  checkpoints: LearningCheckpoint[];
  totalEstimatedHours: number;
  icon: string;
}

/**
 * Grade 1-3 Mathematics Learning Path
 */
export const Grade1MathPath: LearningPath = {
  id: 'math-gr1',
  subject: 'mathematics',
  grade: 'grade-1',
  pathName: 'Numbers & Counting',
  description: 'Master counting, number recognition, and simple addition',
  totalEstimatedHours: 12,
  icon: '🔢',
  checkpoints: [
    {
      competencyCode: 'MA1.1.1',
      competencyName: 'Number Recognition 0-10',
      description: 'Recognize and name numbers from 0 to 10',
      suggestedDuration: 60,
      estimatedQuestions: 15,
      validateBefore: [],
    },
    {
      competencyCode: 'MA1.1.2',
      competencyName: 'Counting & Cardinality',
      description: 'Count objects and understand one-to-one correspondence',
      suggestedDuration: 90,
      estimatedQuestions: 20,
      validateBefore: ['MA1.1.1'],
    },
    {
      competencyCode: 'MA1.2.1',
      competencyName: 'Addition with Objects',
      description: 'Add small numbers using concrete objects',
      suggestedDuration: 120,
      estimatedQuestions: 25,
      validateBefore: ['MA1.1.2'],
    },
    {
      competencyCode: 'MA1.2.2',
      competencyName: 'Simple Subtraction',
      description: 'Subtract small numbers using objects',
      suggestedDuration: 120,
      estimatedQuestions: 25,
      validateBefore: ['MA1.2.1'],
    },
  ],
};

/**
 * Grade 1-3 English Learning Path
 */
export const Grade1EnglishPath: LearningPath = {
  id: 'english-gr1',
  subject: 'english-activities',
  grade: 'grade-1',
  pathName: 'Phonics & Sound',
  description: 'Learn letter sounds and begin blending',
  totalEstimatedHours: 15,
  icon: '📖',
  checkpoints: [
    {
      competencyCode: 'EN1.1.1',
      competencyName: 'Letter Recognition A-Z',
      description: 'Recognize uppercase and lowercase letters',
      suggestedDuration: 120,
      estimatedQuestions: 26,
      validateBefore: [],
    },
    {
      competencyCode: 'EN1.1.2',
      competencyName: 'Letter Sounds',
      description: 'Produce sounds for individual letters',
      suggestedDuration: 150,
      estimatedQuestions: 30,
      validateBefore: ['EN1.1.1'],
    },
    {
      competencyCode: 'EN1.1.3',
      competencyName: 'Sound Blending',
      description: 'Blend sounds to read simple words',
      suggestedDuration: 180,
      estimatedQuestions: 40,
      validateBefore: ['EN1.1.2'],
    },
    {
      competencyCode: 'EN1.1.4',
      competencyName: 'Reading Simple Sentences',
      description: 'Read short, simple sentences with CVC words',
      suggestedDuration: 180,
      estimatedQuestions: 40,
      validateBefore: ['EN1.1.3'],
    },
  ],
};

/**
 * Grade 4-6 Science Learning Path
 */
export const Grade4SciencePath: LearningPath = {
  id: 'science-gr4',
  subject: 'science-and-technology',
  grade: 'grade-4',
  pathName: 'Living Things & Habitats',
  description: 'Explore animals, plants, and their environments',
  totalEstimatedHours: 18,
  icon: '🌿',
  checkpoints: [
    {
      competencyCode: 'SC4.1.1',
      competencyName: 'Animal Classification',
      description: 'Classify animals by characteristics',
      suggestedDuration: 120,
      estimatedQuestions: 20,
      validateBefore: [],
    },
    {
      competencyCode: 'SC4.1.2',
      competencyName: 'Plant Parts & Functions',
      description: 'Learn plant structures and their roles',
      suggestedDuration: 120,
      estimatedQuestions: 20,
      validateBefore: [],
    },
    {
      competencyCode: 'SC4.2.1',
      competencyName: 'Food Chains',
      description: 'Understand energy flow in ecosystems',
      suggestedDuration: 150,
      estimatedQuestions: 25,
      validateBefore: ['SC4.1.1', 'SC4.1.2'],
    },
    {
      competencyCode: 'SC4.3.1',
      competencyName: 'Habitats & Adaptation',
      description: 'Explore how animals adapt to environments',
      suggestedDuration: 150,
      estimatedQuestions: 25,
      validateBefore: ['SC4.2.1'],
    },
  ],
};

/**
 * Collection of all defined learning paths
 */
export const allLearningPaths: LearningPath[] = [
  Grade1MathPath,
  Grade1EnglishPath,
  Grade4SciencePath,
];

/**
 * Get learning path for subject and grade
 */
export function getLearningPath(subject: string, grade: string): LearningPath | undefined {
  return allLearningPaths.find(
    (path) => path.subject === subject && path.grade === grade
  );
}

/**
 * Get all paths available for a grade
 */
export function getPathsForGrade(grade: string): LearningPath[] {
  return allLearningPaths.filter((path) => path.grade === grade);
}

/**
 * Get next checkpoint in path based on progress
 */
export function getNextCheckpoint(
  path: LearningPath,
  masteredCompetencies: string[]
): LearningCheckpoint | undefined {
  for (const checkpoint of path.checkpoints) {
    // Check if prerequisites are met
    const prereqsMet = checkpoint.validateBefore.every((prereq) =>
      masteredCompetencies.includes(prereq)
    );

    // Check if this checkpoint is not yet mastered
    if (prereqsMet && !masteredCompetencies.includes(checkpoint.competencyCode)) {
      return checkpoint;
    }
  }

  return undefined; // All checkpoints mastered or no eligible checkpoint
}

/**
 * Calculate progress through a learning path
 */
export function calculatePathProgress(
  path: LearningPath,
  masteredCompetencies: string[]
): {
  totalCheckpoints: number;
  completedCheckpoints: number;
  percentComplete: number;
  currentCheckpoint: LearningCheckpoint | undefined;
} {
  const completed = path.checkpoints.filter((c) =>
    masteredCompetencies.includes(c.competencyCode)
  );

  const current = getNextCheckpoint(path, masteredCompetencies);

  return {
    totalCheckpoints: path.checkpoints.length,
    completedCheckpoints: completed.length,
    percentComplete: Math.round((completed.length / path.checkpoints.length) * 100),
    currentCheckpoint: current,
  };
}
