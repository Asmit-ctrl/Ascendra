//! Content generation service for Magic School AI
//!
//! Auto-generates lessons, quizzes, and reports using LLM.

use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use uuid::Uuid;

use crate::config::AppConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedContent {
    #[serde(rename = "type")]
    pub content_type: String,
    pub title: String,
    pub content: String,
    pub metadata: serde_json::Value,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LessonPlanRequest {
    pub topic: String,
    pub grade: String,
    pub subject: String,
    pub duration: i32,
    #[serde(default)]
    pub objectives: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QuizRequest {
    pub topic: String,
    pub grade: String,
    pub subject: String,
    pub difficulty: String,
    pub questions: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReportRequest {
    pub student_id: Uuid,
    pub report_type: String,
    pub period: String,
}

/// Generate a CBC-aligned lesson plan
pub async fn generate_lesson_plan(
    config: &AppConfig,
    request: LessonPlanRequest,
) -> Result<GeneratedContent> {
    let prompt = format!(
        r#"Generate a detailed lesson plan for the Kenyan CBC curriculum.

**Subject:** {}
**Grade:** {}
**Topic:** {}
**Duration:** {} minutes
**Learning Objectives:** {}

Please include:
1. Learning objectives (specific, measurable)
2. Materials needed
3. Lesson structure:
   - Introduction (10 minutes)
   - Main activity (20 minutes)
   - Practice (5 minutes)
   - Conclusion (5 minutes)
4. Assessment methods
5. Differentiation strategies
6. Homework assignment

Use Kenyan context and examples (KES currency, local places, cultural references).
Format as Markdown with clear headings."#,
        request.subject,
        request.grade,
        request.topic,
        request.duration,
        request.objectives.as_deref().unwrap_or("Students will understand the key concepts")
    );

    let content = call_llm(config, &prompt).await?;

    Ok(GeneratedContent {
        content_type: "lesson".to_string(),
        title: format!("Lesson Plan: {}", request.topic),
        content,
        metadata: json!({
            "subject": request.subject,
            "grade": request.grade,
            "topic": request.topic,
            "duration": format!("{} minutes", request.duration)
        }),
        generated_at: Utc::now(),
    })
}

/// Generate a CBC-aligned quiz
pub async fn generate_quiz(
    config: &AppConfig,
    request: QuizRequest,
) -> Result<GeneratedContent> {
    let prompt = format!(
        r#"Generate a {} difficulty quiz for the Kenyan CBC curriculum.

**Subject:** {}
**Grade:** {}
**Topic:** {}
**Number of Questions:** {}

Please include:
1. {} multiple choice questions (A, B, C, D options)
2. Each question should test understanding of {}
3. Provide the correct answer for each question
4. Include a brief explanation for each answer
5. Add a marking scheme (points per question, total marks, pass mark)
6. Use Kenyan context in questions where appropriate

Format as Markdown with clear numbering."#,
        request.difficulty,
        request.subject,
        request.grade,
        request.topic,
        request.questions,
        request.questions,
        request.topic
    );

    let content = call_llm(config, &prompt).await?;

    Ok(GeneratedContent {
        content_type: "quiz".to_string(),
        title: format!("Quiz: {}", request.topic),
        content,
        metadata: json!({
            "subject": request.subject,
            "grade": request.grade,
            "topic": request.topic,
            "difficulty": request.difficulty,
            "questions": request.questions
        }),
        generated_at: Utc::now(),
    })
}

/// Generate a student progress report
pub async fn generate_report(
    config: &AppConfig,
    request: ReportRequest,
    student_data: serde_json::Value,
) -> Result<GeneratedContent> {
    let prompt = format!(
        r#"Generate a comprehensive student progress report.

**Student ID:** {}
**Report Type:** {}
**Period:** {}

**Student Data:**
{}

Please include:
1. Academic performance summary (by subject)
2. Strengths and areas for improvement
3. Learning behavior (attendance, participation, homework)
4. AI tutor insights (from Mwalimu AI data)
5. Teacher comments
6. Recommendations for parents
7. Next steps and goals

Use professional language suitable for parents and school administration.
Format as Markdown with clear sections."#,
        request.student_id,
        request.report_type,
        request.period,
        serde_json::to_string_pretty(&student_data)?
    );

    let content = call_llm(config, &prompt).await?;

    Ok(GeneratedContent {
        content_type: "report".to_string(),
        title: format!("Progress Report - Student {}", request.student_id),
        content,
        metadata: json!({
            "student_id": request.student_id,
            "report_type": request.report_type,
            "period": request.period
        }),
        generated_at: Utc::now(),
    })
}

/// Call LLM API (OpenAI, Groq, or Gemini)
async fn call_llm(config: &AppConfig, prompt: &str) -> Result<String> {
    // Try OpenAI first
    if !config.openai_api_key.is_empty() {
        return call_openai(&config.openai_api_key, prompt).await;
    }

    // Try Gemini as fallback
    if !config.gemini_api_key.is_empty() {
        return call_gemini(&config.gemini_api_key, prompt).await;
    }

    Err(anyhow!("No LLM API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY"))
}

/// Call OpenAI API
async fn call_openai(api_key: &str, prompt: &str) -> Result<String> {
    let client = Client::new();

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "gpt-4",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert Kenyan educator creating CBC-aligned educational content. Be specific, practical, and culturally relevant."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        }))
        .timeout(Duration::from_secs(60))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await?;
        return Err(anyhow!("OpenAI API error {}: {}", status, text));
    }

    let data: serde_json::Value = response.json().await?;
    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| anyhow!("Invalid OpenAI response format"))?;

    Ok(content.to_string())
}

/// Call Gemini API
async fn call_gemini(api_key: &str, prompt: &str) -> Result<String> {
    let client = Client::new();

    let response = client
        .post(format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={}",
            api_key
        ))
        .header("Content-Type", "application/json")
        .json(&json!({
            "contents": [{
                "parts": [{
                    "text": format!(
                        "You are an expert Kenyan educator creating CBC-aligned educational content. Be specific, practical, and culturally relevant.\n\n{}",
                        prompt
                    )
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2000
            }
        }))
        .timeout(Duration::from_secs(60))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await?;
        return Err(anyhow!("Gemini API error {}: {}", status, text));
    }

    let data: serde_json::Value = response.json().await?;
    let content = data["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| anyhow!("Invalid Gemini response format"))?;

    Ok(content.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lesson_plan_request() {
        let request = LessonPlanRequest {
            topic: "Fractions".to_string(),
            grade: "Grade 5".to_string(),
            subject: "Mathematics".to_string(),
            duration: 40,
            objectives: Some("Students will understand fractions".to_string()),
        };

        assert_eq!(request.topic, "Fractions");
        assert_eq!(request.duration, 40);
    }

    #[test]
    fn test_quiz_request() {
        let request = QuizRequest {
            topic: "Photosynthesis".to_string(),
            grade: "Grade 6".to_string(),
            subject: "Science".to_string(),
            difficulty: "Medium".to_string(),
            questions: 10,
        };

        assert_eq!(request.questions, 10);
        assert_eq!(request.difficulty, "Medium");
    }
}
