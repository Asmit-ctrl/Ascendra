//! Integration tests for the mem0 memory service.
//!
//! These tests exercise the disabled-mode behavior (no MEM0_API_KEY) so they
//! never make a network call and remain reproducible offline. Live API
//! coverage is gated behind `MEM0_API_KEY` and skipped otherwise.

use syncsenta_backend::services::memory::{
    add_turn, format_for_prompt, is_enabled, recall, Mem0Message, RecalledMemory,
};

#[test]
fn enabled_flag_tracks_blank_keys() {
    assert!(!is_enabled(""));
    assert!(!is_enabled("   "));
    assert!(is_enabled("test-key"));
}

#[test]
fn format_for_prompt_collects_each_memory() {
    let mems = vec![
        RecalledMemory {
            id: "1".into(),
            memory: "Comfortable with addition".into(),
            score: 0.9,
        },
        RecalledMemory {
            id: "2".into(),
            memory: "Confused by long division".into(),
            score: 0.7,
        },
    ];
    let out = format_for_prompt(&mems);
    assert!(out.starts_with("Relevant prior context"));
    assert!(out.contains("Comfortable with addition"));
    assert!(out.contains("Confused by long division"));
}

#[tokio::test]
async fn add_turn_is_a_noop_without_api_key() {
    let res = add_turn(
        "",
        "student-uuid",
        vec![Mem0Message {
            role: "user".into(),
            content: "What is photosynthesis?".into(),
        }],
        None,
    )
    .await;
    assert!(res.is_ok(), "add_turn must soft-fail when disabled");
}

#[tokio::test]
async fn recall_returns_empty_without_api_key() {
    let mems = recall("", "student-uuid", "photosynthesis", 5).await.unwrap();
    assert!(mems.is_empty());
}

#[tokio::test]
async fn recall_requires_user_id_when_enabled() {
    let res = recall("fake-key", "", "photosynthesis", 5).await;
    assert!(res.is_err(), "must reject blank user_id when API key is set");
}
