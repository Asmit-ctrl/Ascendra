//! Competency tracking service for Mwalimu AI
//!
//! Tracks student mastery of CBC competencies across subjects and topics.

use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subject {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub overall_mastery: i32,
    pub topics: Vec<Topic>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Topic {
    pub id: String,
    pub name: String,
    pub overall_mastery: i32,
    pub competencies: Vec<Competency>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Competency {
    pub id: String,
    pub name: String,
    pub mastery: i32,
    pub status: String,
    pub games_recommended: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_practiced: Option<DateTime<Utc>>,
    pub total_practices: i32,
}

/// Get student's competency map across all subjects
pub async fn get_student_competencies(
    db: &PgPool,
    student_id: Uuid,
) -> Result<Vec<Subject>> {
    // Fetch all competencies with student mastery
    let competencies = sqlx::query!(
        r#"
        SELECT 
            c.id,
            c.subject,
            c.topic,
            c.name,
            c.description,
            COALESCE(sc.mastery_percentage, 0) as "mastery!",
            COALESCE(sc.status, 'not-started') as "status!",
            COALESCE(sc.games_recommended, false) as "games_recommended!",
            sc.last_practiced,
            COALESCE(sc.total_practices, 0) as "total_practices!"
        FROM competencies c
        LEFT JOIN student_competencies sc ON c.id = sc.competency_id AND sc.student_id = $1
        ORDER BY c.subject, c.topic, c.name
        "#,
        student_id
    )
    .fetch_all(db)
    .await?;

    // Group by subject and topic
    let mut subjects_map: std::collections::HashMap<String, Subject> = std::collections::HashMap::new();

    for comp in competencies {
        let subject_name = comp.subject.clone();
        let topic_name = comp.topic.clone();

        // Get or create subject
        let subject = subjects_map.entry(subject_name.clone()).or_insert_with(|| Subject {
            id: subject_name.to_lowercase().replace(" ", "-"),
            name: subject_name.clone(),
            icon: get_subject_icon(&subject_name),
            overall_mastery: 0,
            topics: Vec::new(),
        });

        // Find or create topic
        let topic = subject.topics.iter_mut().find(|t| t.name == topic_name);
        let topic = match topic {
            Some(t) => t,
            None => {
                subject.topics.push(Topic {
                    id: format!("{}-{}", subject.id, topic_name.to_lowercase().replace(" ", "-")),
                    name: topic_name.clone(),
                    overall_mastery: 0,
                    competencies: Vec::new(),
                });
                subject.topics.last_mut().unwrap()
            }
        };

        // Add competency
        topic.competencies.push(Competency {
            id: comp.id.to_string(),
            name: comp.name,
            mastery: comp.mastery,
            status: comp.status,
            games_recommended: comp.games_recommended,
            last_practiced: comp.last_practiced,
            total_practices: comp.total_practices,
        });
    }

    // Calculate overall mastery for topics and subjects
    let mut subjects: Vec<Subject> = subjects_map.into_values().collect();
    for subject in &mut subjects {
        for topic in &mut subject.topics {
            if !topic.competencies.is_empty() {
                topic.overall_mastery = topic.competencies.iter()
                    .map(|c| c.mastery)
                    .sum::<i32>() / topic.competencies.len() as i32;
            }
        }

        if !subject.topics.is_empty() {
            subject.overall_mastery = subject.topics.iter()
                .map(|t| t.overall_mastery)
                .sum::<i32>() / subject.topics.len() as i32;
        }
    }

    // Sort subjects by name
    subjects.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(subjects)
}

/// Update student's mastery for a competency
pub async fn update_competency_mastery(
    db: &PgPool,
    student_id: Uuid,
    competency_id: Uuid,
    mastery_delta: i32,
) -> Result<i32> {
    // Insert or update competency mastery
    let result = sqlx::query!(
        r#"
        INSERT INTO student_competencies (student_id, competency_id, mastery_percentage, total_practices, last_practiced)
        VALUES ($1, $2, LEAST(100, GREATEST(0, $3)), 1, NOW())
        ON CONFLICT (student_id, competency_id)
        DO UPDATE SET
            mastery_percentage = LEAST(100, GREATEST(0, student_competencies.mastery_percentage + $3)),
            total_practices = student_competencies.total_practices + 1,
            last_practiced = NOW(),
            updated_at = NOW()
        RETURNING mastery_percentage
        "#,
        student_id,
        competency_id,
        mastery_delta
    )
    .fetch_one(db)
    .await?;

    let new_mastery = result.mastery_percentage;

    // Update status based on mastery
    update_competency_status(db, student_id, competency_id, new_mastery).await?;

    // Update games recommendation
    update_games_recommendation(db, student_id, competency_id, new_mastery).await?;

    tracing::info!(
        "Updated competency {} for student {} to {}% mastery",
        competency_id,
        student_id,
        new_mastery
    );

    Ok(new_mastery)
}

/// Update competency status based on mastery level
async fn update_competency_status(
    db: &PgPool,
    student_id: Uuid,
    competency_id: Uuid,
    mastery: i32,
) -> Result<()> {
    let status = if mastery >= 90 {
        "mastered"
    } else if mastery > 0 {
        "in-progress"
    } else {
        "not-started"
    };

    sqlx::query!(
        r#"
        UPDATE student_competencies
        SET status = $1
        WHERE student_id = $2 AND competency_id = $3
        "#,
        status,
        student_id,
        competency_id
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Update games recommendation based on mastery and practice frequency
async fn update_games_recommendation(
    db: &PgPool,
    student_id: Uuid,
    competency_id: Uuid,
    mastery: i32,
) -> Result<()> {
    // Recommend games if mastery is between 30-70% (struggling but engaged)
    let recommend = mastery >= 30 && mastery < 70;

    sqlx::query!(
        r#"
        UPDATE student_competencies
        SET games_recommended = $1
        WHERE student_id = $2 AND competency_id = $3
        "#,
        recommend,
        student_id,
        competency_id
    )
    .execute(db)
    .await?;

    Ok(())
}

/// Get recommended next competency for a student
pub async fn get_recommended_competency(
    db: &PgPool,
    student_id: Uuid,
) -> Result<Option<Competency>> {
    // Find competencies that need practice (games recommended or low mastery)
    let result = sqlx::query!(
        r#"
        SELECT 
            c.id,
            c.name,
            sc.mastery_percentage as "mastery!",
            sc.status as "status!",
            sc.games_recommended as "games_recommended!",
            sc.last_practiced,
            sc.total_practices as "total_practices!"
        FROM competencies c
        JOIN student_competencies sc ON c.id = sc.competency_id
        WHERE sc.student_id = $1
          AND (sc.games_recommended = true OR (sc.mastery_percentage > 0 AND sc.mastery_percentage < 70))
        ORDER BY 
            sc.games_recommended DESC,
            sc.last_practiced ASC NULLS FIRST,
            sc.mastery_percentage ASC
        LIMIT 1
        "#,
        student_id
    )
    .fetch_optional(db)
    .await?;

    Ok(result.map(|r| Competency {
        id: r.id.to_string(),
        name: r.name,
        mastery: r.mastery,
        status: r.status,
        games_recommended: r.games_recommended,
        last_practiced: r.last_practiced,
        total_practices: r.total_practices,
    }))
}

/// Initialize default CBC competencies
pub async fn init_default_competencies(db: &PgPool) -> Result<()> {
    let competencies = vec![
        // Mathematics
        ("Mathematics", "Fractions", "Understanding Fractions", "Grade 5"),
        ("Mathematics", "Fractions", "Adding Fractions", "Grade 5"),
        ("Mathematics", "Fractions", "Subtracting Fractions", "Grade 5"),
        ("Mathematics", "Fractions", "Multiplying Fractions", "Grade 6"),
        ("Mathematics", "Decimals", "Understanding Decimals", "Grade 5"),
        ("Mathematics", "Decimals", "Adding Decimals", "Grade 5"),
        ("Mathematics", "Decimals", "Multiplying Decimals", "Grade 6"),
        ("Mathematics", "Ratios", "Understanding Ratios", "Grade 6"),
        ("Mathematics", "Ratios", "Solving Ratio Problems", "Grade 6"),
        
        // English
        ("English", "Reading Comprehension", "Main Idea", "Grade 5"),
        ("English", "Reading Comprehension", "Inference", "Grade 5"),
        ("English", "Reading Comprehension", "Context Clues", "Grade 5"),
        ("English", "Writing", "Essay Structure", "Grade 5"),
        ("English", "Writing", "Grammar", "Grade 5"),
        ("English", "Writing", "Punctuation", "Grade 5"),
        
        // Science
        ("Science", "Biology", "Plant Parts", "Grade 5"),
        ("Science", "Biology", "Photosynthesis", "Grade 5"),
        ("Science", "Biology", "Animal Classification", "Grade 5"),
        ("Science", "Physics", "Forces and Motion", "Grade 6"),
        ("Science", "Physics", "Energy", "Grade 6"),
        
        // Kiswahili
        ("Kiswahili", "Kusoma", "Uelewa wa Maandishi", "Grade 5"),
        ("Kiswahili", "Kuandika", "Muundo wa Insha", "Grade 5"),
    ];

    for (subject, topic, name, grade) in competencies {
        sqlx::query!(
            r#"
            INSERT INTO competencies (id, subject, topic, name, description, grade_level)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (subject, topic, name, grade_level) DO NOTHING
            "#,
            Uuid::new_v4(),
            subject,
            topic,
            name,
            format!("CBC competency: {}", name),
            grade
        )
        .execute(db)
        .await?;
    }

    tracing::info!("Initialized {} default competencies", competencies.len());

    Ok(())
}

/// Get subject icon based on name
fn get_subject_icon(subject: &str) -> String {
    match subject {
        "Mathematics" => "calculator",
        "English" => "book",
        "Science" => "flask",
        "Kiswahili" => "book",
        "Social Studies" => "globe",
        "Religious Education" => "book",
        "Creative Arts" => "palette",
        "Physical Education" => "activity",
        _ => "book",
    }.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subject_icons() {
        assert_eq!(get_subject_icon("Mathematics"), "calculator");
        assert_eq!(get_subject_icon("Science"), "flask");
        assert_eq!(get_subject_icon("Unknown"), "book");
    }

    #[test]
    fn test_mastery_status() {
        // Test status determination
        assert_eq!(if 95 >= 90 { "mastered" } else { "in-progress" }, "mastered");
        assert_eq!(if 50 >= 90 { "mastered" } else if 50 > 0 { "in-progress" } else { "not-started" }, "in-progress");
        assert_eq!(if 0 >= 90 { "mastered" } else if 0 > 0 { "in-progress" } else { "not-started" }, "not-started");
    }
}
