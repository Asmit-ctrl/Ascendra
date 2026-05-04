//! mem0 long-term memory client for Mwalimu AI + MeTTa.
//!
//! Stores per-student conversational and pedagogical memories in mem0
//! (https://api.mem0.ai) so the symbolic reasoning layer (MeTTa) can be
//! enriched with prior interaction context on each turn.
//!
//! Wraps the v3 REST API:
//! - POST /v3/memories/add/    — write turns
//! - POST /v3/memories/search/ — semantic recall by user_id

use anyhow::{anyhow, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

const MEM0_BASE_URL: &str = "https://api.mem0.ai";
const REQUEST_TIMEOUT_SECS: u64 = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mem0Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecalledMemory {
    pub id: String,
    pub memory: String,
    pub score: f32,
}

/// True when the backend is configured to talk to mem0.
pub fn is_enabled(api_key: &str) -> bool {
    !api_key.trim().is_empty()
}

/// Persist a user/assistant turn to mem0 keyed by `user_id`.
///
/// Returns `Ok(())` and logs (not errors) when mem0 is unconfigured so that
/// memory remains a soft enhancement — never a hard dependency of chat.
pub async fn add_turn(
    api_key: &str,
    user_id: &str,
    messages: Vec<Mem0Message>,
    metadata: Option<Value>,
) -> Result<()> {
    if !is_enabled(api_key) {
        tracing::debug!("mem0: skipping add_turn (no MEM0_API_KEY)");
        return Ok(());
    }
    if user_id.is_empty() {
        return Err(anyhow!("mem0 add_turn: user_id required"));
    }

    let client = Client::new();
    let mut body = json!({
        "messages": messages,
        "user_id": user_id,
        "infer": true,
    });
    if let Some(meta) = metadata {
        body["metadata"] = meta;
    }

    let resp = client
        .post(format!("{}/v3/memories/add/", MEM0_BASE_URL))
        .header("Authorization", format!("Token {}", api_key))
        .header("Accept", "application/json")
        .json(&body)
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .send()
        .await
        .map_err(|e| anyhow!("mem0 add request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(anyhow!("mem0 add error {status}: {text}"));
    }
    Ok(())
}

/// Semantic-search recent memories for a student. `top_k` defaults to 5.
///
/// Returns an empty list when mem0 is unconfigured so callers can layer
/// recall without branching on availability.
pub async fn recall(
    api_key: &str,
    user_id: &str,
    query: &str,
    top_k: u32,
) -> Result<Vec<RecalledMemory>> {
    if !is_enabled(api_key) {
        return Ok(Vec::new());
    }
    if user_id.is_empty() {
        return Err(anyhow!("mem0 recall: user_id required"));
    }

    let client = Client::new();
    let body = json!({
        "query": query,
        "filters": { "user_id": user_id },
        "top_k": top_k,
        "threshold": 0.1,
    });

    let resp = client
        .post(format!("{}/v3/memories/search/", MEM0_BASE_URL))
        .header("Authorization", format!("Token {}", api_key))
        .header("Accept", "application/json")
        .json(&body)
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .send()
        .await
        .map_err(|e| anyhow!("mem0 search request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(anyhow!("mem0 search error {status}: {text}"));
    }

    let payload: Value = resp
        .json()
        .await
        .map_err(|e| anyhow!("mem0 search decode failed: {e}"))?;

    let results = payload
        .get("results")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    Ok(results
        .into_iter()
        .filter_map(|r| {
            Some(RecalledMemory {
                id: r.get("id")?.as_str()?.to_string(),
                memory: r.get("memory")?.as_str()?.to_string(),
                score: r.get("score").and_then(|s| s.as_f64()).unwrap_or(0.0) as f32,
            })
        })
        .collect())
}

/// Format recalled memories as a compact prompt-ready block to prepend to a
/// MeTTa or LLM system prompt.
pub fn format_for_prompt(memories: &[RecalledMemory]) -> String {
    if memories.is_empty() {
        return String::new();
    }
    let mut out = String::from("Relevant prior context about this student:\n");
    for m in memories {
        out.push_str(&format!("- {}\n", m.memory));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disabled_when_key_blank() {
        assert!(!is_enabled(""));
        assert!(!is_enabled("   "));
        assert!(is_enabled("test-key"));
    }

    #[test]
    fn format_empty_returns_empty() {
        assert_eq!(format_for_prompt(&[]), "");
    }

    #[test]
    fn format_includes_each_memory() {
        let mems = vec![
            RecalledMemory {
                id: "1".into(),
                memory: "Loves fractions".into(),
                score: 0.9,
            },
            RecalledMemory {
                id: "2".into(),
                memory: "Struggles with decimals".into(),
                score: 0.8,
            },
        ];
        let out = format_for_prompt(&mems);
        assert!(out.contains("Loves fractions"));
        assert!(out.contains("Struggles with decimals"));
    }

    #[tokio::test]
    async fn add_turn_skips_when_disabled() {
        let res = add_turn(
            "",
            "student-1",
            vec![Mem0Message {
                role: "user".into(),
                content: "hi".into(),
            }],
            None,
        )
        .await;
        assert!(res.is_ok());
    }

    #[tokio::test]
    async fn recall_returns_empty_when_disabled() {
        let res = recall("", "student-1", "fractions", 5).await.unwrap();
        assert!(res.is_empty());
    }
}
