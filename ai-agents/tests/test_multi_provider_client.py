"""Offline tests for the NVIDIA NIM provider adapter."""

import pytest

from syncsenta_agents.inference.multi_provider_client import (
    MultiProviderClient,
    ProviderConfig,
    ProviderType,
)


def test_nvidia_is_configured_when_key_is_present(monkeypatch):
    monkeypatch.setenv("NVIDIA_API_KEY", "test-nvidia-key")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    client = MultiProviderClient()

    assert client.providers[0].name == ProviderType.NVIDIA
    assert client.providers[0].models == [
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
    ]


@pytest.mark.asyncio
async def test_nvidia_adapter_returns_completion(monkeypatch):
    client = MultiProviderClient.__new__(MultiProviderClient)
    provider = ProviderConfig(
        name=ProviderType.NVIDIA,
        api_key="test-nvidia-key",
        base_url="https://example.invalid/v1",
        models=["test-model"],
        reasoning_budget=128,
        top_p=0.95,
    )

    captured = {}

    class FakeResponse:
        is_error = False
        status_code = 200
        text = ""

        @staticmethod
        def json():
            return {"choices": [{"message": {"content": "Generated scheme"}}]}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

        async def post(self, url, *, headers, json):
            captured["url"] = url
            captured["headers"] = headers
            captured["payload"] = json
            return FakeResponse()

    monkeypatch.setattr(
        "syncsenta_agents.inference.multi_provider_client.httpx.AsyncClient",
        FakeClient,
    )

    result = await client._generate_nvidia(
        provider,
        prompt="Build a Grade 4 scheme",
        system="You are a CBC specialist",
        max_tokens=512,
        temperature=0.3,
    )

    assert result == "Generated scheme"
    assert captured["url"] == "https://example.invalid/v1/chat/completions"
    assert captured["payload"]["reasoning_budget"] == 128
    assert captured["payload"]["messages"][0]["role"] == "system"
