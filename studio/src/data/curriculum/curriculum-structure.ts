import { getHardcodedStrands, getSubjectsForGrade } from './index'

// Create a structured curriculum data object for easy access
export const curriculumData = {
  'lower-primary': {
    'grade-1': {
      'creative-activities': getHardcodedStrands('Grade 1', 'Creative Activities'),
      'cre': getHardcodedStrands('Grade 1', 'CRE'),
      'hre': getHardcodedStrands('Grade 1', 'HRE'),
      'ire': getHardcodedStrands('Grade 1', 'IRE'),
      'kiswahili': getHardcodedStrands('Grade 1', 'Kiswahili'),
      'environmental-activities': getHardcodedStrands('Grade 1', 'Environmental Activities'),
      'english-activities': getHardcodedStrands('Grade 1', 'English Activities'),
      'mathematics': getHardcodedStrands('Grade 1', 'Mathematics'),
    },
    'grade-2': {
      'creative-activities': getHardcodedStrands('Grade 2', 'Creative Activities'),
      'cre': getHardcodedStrands('Grade 2', 'CRE'),
      'hre': getHardcodedStrands('Grade 2', 'HRE'),
      'ire': getHardcodedStrands('Grade 2', 'IRE'),
      'kiswahili': getHardcodedStrands('Grade 2', 'Kiswahili'),
      'environmental-activities': getHardcodedStrands('Grade 2', 'Environmental Activities'),
      'english-activities': getHardcodedStrands('Grade 2', 'English Activities'),
      'mathematics': getHardcodedStrands('Grade 2', 'Mathematics'),
    },
    'grade-3': {
      'creative-activities': getHardcodedStrands('Grade 3', 'Creative Activities'),
      'cre': getHardcodedStrands('Grade 3', 'CRE'),
      'hre': getHardcodedStrands('Grade 3', 'HRE'),
      'ire': getHardcodedStrands('Grade 3', 'IRE'),
      'kiswahili': getHardcodedStrands('Grade 3', 'Kiswahili'),
      'environmental-activities': getHardcodedStrands('Grade 3', 'Environmental Activities'),
      'english-activities': getHardcodedStrands('Grade 3', 'English Activities'),
      'mathematics': getHardcodedStrands('Grade 3', 'Mathematics'),
    },
  },
  'upper-primary': {
    'grade-4': {
      'agriculture': getHardcodedStrands('Grade 4', 'Agriculture'),
      'cre': getHardcodedStrands('Grade 4', 'CRE'),
      'creative-arts': getHardcodedStrands('Grade 4', 'Creative Arts'),
      'english': getHardcodedStrands('Grade 4', 'English'),
      'indigenous-language': getHardcodedStrands('Grade 4', 'Indigenous Language'),
      'social-studies': getHardcodedStrands('Grade 4', 'Social Studies'),
      'science-technology': getHardcodedStrands('Grade 4', 'Science & Technology'),
      'kiswahili': getHardcodedStrands('Grade 4', 'Kiswahili'),
    },
    'grade-5': {
      'creative-arts': getHardcodedStrands('Grade 5', 'Creative Arts'),
      'english': getHardcodedStrands('Grade 5', 'English'),
      'indigenous-language': getHardcodedStrands('Grade 5', 'Indigenous Language'),
      'mathematics': getHardcodedStrands('Grade 5', 'Mathematics'),
    },
    'grade-6': {
      'agriculture': getHardcodedStrands('Grade 6', 'Agriculture'),
      'english': getHardcodedStrands('Grade 6', 'English'),
      'indigenous-language': getHardcodedStrands('Grade 6', 'Indigenous Language'),
      'kiswahili': getHardcodedStrands('Grade 6', 'Kiswahili'),
      'mathematics': getHardcodedStrands('Grade 6', 'Mathematics'),
      'social-studies': getHardcodedStrands('Grade 6', 'Social Studies'),
    },
  },
}
