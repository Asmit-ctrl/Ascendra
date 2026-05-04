// STUDENT-FOCUSED BUILD: Only student-related services active
pub mod assessment;  // Student assessments and MeTTa
pub mod auth;        // Authentication (needed for student login)
pub mod mastery;     // Student skill mastery tracking
pub mod memory;      // mem0 long-term memory for student/MeTTa context
pub mod mwalimu;     // Mwalimu AI chat for students
pub mod translation; // Gikuyu translation for multilingual learning

// MVP FEATURES: Gamification, competency tracking, content generation
pub mod gamification;       // Points, levels, badges, streaks
pub mod competency;         // CBC competency tracking
pub mod content_generation; // Magic School AI (lessons, quizzes, reports)

// COMMENTED OUT: Non-student services for later implementation
// pub mod analytics;      // Teacher/admin analytics
// pub mod approvals;      // Admin approval workflows
// pub mod ipfs;          // IPFS storage (teacher schemes)
// pub mod notifications; // System notifications
// pub mod payment;       // Payment processing
// pub mod scheme;        // Scheme generation (teacher-only)
// pub mod sms;           // SMS notifications
// pub mod sync;          // Data synchronization
// pub mod token_economy; // Blockchain tokens
// pub mod wallet_mfa;    // Wallet authentication
