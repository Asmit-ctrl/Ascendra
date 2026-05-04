//! Gamification service for Mwalimu AI
//!
//! Handles points, levels, badges, and streaks for student engagement.

use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GamificationData {
    pub points: i32,
    pub level: i32,
    pub streak: i32,
    pub badges: Vec<Badge>,
    pub rank: i32,
    pub total_students: i32,
    pub points_to_next_level: i32,
    pub current_level_points: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Badge {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub earned: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub earned_at: Option<DateTime<Utc>>,
    pub rarity: String,
}

/// Get student's gamification data
pub async fn get_student_gamification(
    db: &PgPool,
    student_id: Uuid,
) -> Result<GamificationData> {
    // Fetch or create gamification record
    let gamification = sqlx::query!(
        r#"
        INSERT INTO student_gamification (student_id, points, level, streak_days, last_activity_date)
        VALUES ($1, 0, 1, 0, CURRENT_DATE)
        ON CONFLICT (student_id) DO UPDATE SET student_id = $1
        RETURNING points, level, streak_days, last_activity_date
        "#,
        student_id
    )
    .fetch_one(db)
    .await?;

    // Fetch earned badges
    let earned_badges = sqlx::query!(
        r#"
        SELECT b.id, b.name, b.description, b.icon, b.rarity, sb.earned_at
        FROM badges b
        JOIN student_badges sb ON b.id = sb.badge_id
        WHERE sb.student_id = $1
        ORDER BY sb.earned_at DESC
        "#,
        student_id
    )
    .fetch_all(db)
    .await?;

    // Fetch all available badges
    let all_badges = sqlx::query!(
        r#"
        SELECT id, name, description, icon, rarity
        FROM badges
        ORDER BY rarity DESC, name ASC
        "#
    )
    .fetch_all(db)
    .await?;

    // Combine earned and unearned badges
    let mut badges = Vec::new();
    for badge in all_badges {
        let earned_badge = earned_badges.iter().find(|eb| eb.id == badge.id);
        badges.push(Badge {
            id: badge.id.to_string(),
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            earned: earned_badge.is_some(),
            earned_at: earned_badge.map(|eb| eb.earned_at),
            rarity: badge.rarity,
        });
    }

    // Calculate rank
    let rank_result = sqlx::query_scalar!(
        r#"
        SELECT COUNT(*) + 1 as "rank!"
        FROM student_gamification
        WHERE points > (SELECT points FROM student_gamification WHERE student_id = $1)
        "#,
        student_id
    )
    .fetch_one(db)
    .await?;

    // Get total students
    let total_students = sqlx::query_scalar!(
        r#"SELECT COUNT(*) as "count!" FROM student_gamification"#
    )
    .fetch_one(db)
    .await?;

    // Calculate points for next level (exponential: level * 500)
    let points_to_next_level = (gamification.level + 1) * 500;
    let current_level_points = gamification.points % 500;

    Ok(GamificationData {
        points: gamification.points,
        level: gamification.level,
        streak: gamification.streak_days,
        badges,
        rank: rank_result as i32,
        total_students: total_students as i32,
        points_to_next_level,
        current_level_points,
    })
}

/// Award points to a student
pub async fn award_points(
    db: &PgPool,
    student_id: Uuid,
    points: i32,
    reason: &str,
) -> Result<()> {
    // Update points
    sqlx::query!(
        r#"
        UPDATE student_gamification
        SET points = points + $1,
            updated_at = NOW()
        WHERE student_id = $2
        "#,
        points,
        student_id
    )
    .execute(db)
    .await?;

    // Check for level up
    check_level_up(db, student_id).await?;

    // Check for badge unlocks
    check_badge_unlocks(db, student_id).await?;

    tracing::info!("Awarded {} points to student {} for: {}", points, student_id, reason);

    Ok(())
}

/// Update student's learning streak
pub async fn update_streak(db: &PgPool, student_id: Uuid) -> Result<i32> {
    let result = sqlx::query!(
        r#"
        UPDATE student_gamification
        SET streak_days = CASE
            WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
            WHEN last_activity_date = CURRENT_DATE THEN streak_days
            ELSE 1
        END,
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
        WHERE student_id = $1
        RETURNING streak_days
        "#,
        student_id
    )
    .fetch_one(db)
    .await?;

    // Award streak bonus points
    if result.streak_days % 7 == 0 {
        award_points(db, student_id, 50, "7-day streak bonus").await?;
    }

    Ok(result.streak_days)
}

/// Check and update student level based on points
async fn check_level_up(db: &PgPool, student_id: Uuid) -> Result<()> {
    let result = sqlx::query!(
        r#"
        UPDATE student_gamification
        SET level = (points / 500) + 1
        WHERE student_id = $1
        RETURNING level
        "#,
        student_id
    )
    .fetch_one(db)
    .await?;

    tracing::info!("Student {} is now level {}", student_id, result.level);

    Ok(())
}

/// Check and award badges based on student achievements
async fn check_badge_unlocks(db: &PgPool, student_id: Uuid) -> Result<()> {
    // Get student stats
    let stats = sqlx::query!(
        r#"
        SELECT 
            sg.points,
            sg.level,
            sg.streak_days,
            COUNT(DISTINCT sc.competency_id) FILTER (WHERE sc.mastery_percentage >= 90) as "mastered_competencies!",
            COUNT(DISTINCT sb.badge_id) as "earned_badges!"
        FROM student_gamification sg
        LEFT JOIN student_competencies sc ON sg.student_id = sc.student_id
        LEFT JOIN student_badges sb ON sg.student_id = sb.student_id
        WHERE sg.student_id = $1
        GROUP BY sg.student_id, sg.points, sg.level, sg.streak_days
        "#,
        student_id
    )
    .fetch_one(db)
    .await?;

    // Badge criteria checks
    let badge_checks = vec![
        ("first-steps", stats.earned_badges == 0), // First badge
        ("week-warrior", stats.streak_days >= 7),
        ("math-master", stats.mastered_competencies >= 10),
        ("level-5", stats.level >= 5),
        ("points-1000", stats.points >= 1000),
    ];

    for (badge_name, should_award) in badge_checks {
        if should_award {
            // Check if badge exists and student doesn't have it
            let badge = sqlx::query!(
                r#"
                SELECT b.id
                FROM badges b
                LEFT JOIN student_badges sb ON b.id = sb.badge_id AND sb.student_id = $1
                WHERE b.name = $2 AND sb.badge_id IS NULL
                "#,
                student_id,
                badge_name
            )
            .fetch_optional(db)
            .await?;

            if let Some(badge) = badge {
                // Award badge
                sqlx::query!(
                    r#"
                    INSERT INTO student_badges (student_id, badge_id, earned_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (student_id, badge_id) DO NOTHING
                    "#,
                    student_id,
                    badge.id
                )
                .execute(db)
                .await?;

                tracing::info!("Awarded badge '{}' to student {}", badge_name, student_id);
            }
        }
    }

    Ok(())
}

/// Initialize default badges in the database
pub async fn init_default_badges(db: &PgPool) -> Result<()> {
    let badges = vec![
        ("first-steps", "First Steps", "Completed your first lesson", "star", "common"),
        ("week-warrior", "Week Warrior", "7-day learning streak", "flame", "rare"),
        ("math-master", "Math Master", "Mastered 10 math competencies", "trophy", "epic"),
        ("perfect-score", "Perfect Score", "Got 100% on a quiz", "crown", "legendary"),
        ("helping-hand", "Helping Hand", "Helped 5 classmates", "award", "rare"),
        ("speed-demon", "Speed Demon", "Completed 10 lessons in one day", "zap", "epic"),
        ("level-5", "Level 5 Hero", "Reached level 5", "target", "rare"),
        ("points-1000", "Point Master", "Earned 1000 points", "sparkles", "epic"),
    ];

    for (name, display_name, description, icon, rarity) in badges {
        sqlx::query!(
            r#"
            INSERT INTO badges (id, name, description, icon, rarity, criteria)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (name) DO NOTHING
            "#,
            Uuid::new_v4(),
            name,
            description,
            icon,
            rarity,
            serde_json::json!({"name": name})
        )
        .execute(db)
        .await?;
    }

    tracing::info!("Initialized {} default badges", badges.len());

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_level_calculation() {
        // Level 1: 0-499 points
        // Level 2: 500-999 points
        // Level 3: 1000-1499 points
        assert_eq!(0 / 500 + 1, 1);
        assert_eq!(499 / 500 + 1, 1);
        assert_eq!(500 / 500 + 1, 2);
        assert_eq!(1250 / 500 + 1, 3);
    }
}
