from fastapi import APIRouter, HTTPException
from typing import List
from app.models.config_db import AgentConfig, LLMProvider
from app.services.config_db import config_service

router = APIRouter()

@router.on_event("startup")
async def startup_event():
    await config_service.init_defaults()

@router.get("/config/agents", response_model=List[AgentConfig])
async def get_agents():
    return await config_service.get_all_agents()

@router.get("/config/agents/{agent_id}", response_model=AgentConfig)
async def get_agent(agent_id: str):
    agent = await config_service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.get("/config/providers", response_model=List[LLMProvider])
async def get_providers():
    providers = await config_service.get_all_providers()
    # Mask API Keys for security
    for p in providers:
        if p.apiKey:
            # Simple Masking: sk-****1234
            visible_chars = 4
            if len(p.apiKey) > 8:
                p.apiKey = f"{p.apiKey[:3]}****{p.apiKey[-4:]}"
            else:
                p.apiKey = "********"
    return providers

# Internal endpoint for BioExtract-AI to get unmasked providers
# This should only be called from same origin (internal use)
@router.get("/config/providers/internal", response_model=List[LLMProvider])
async def get_providers_internal():
    """Returns providers with unmasked API keys for internal use by agents."""
    return await config_service.get_all_providers()

@router.post("/config/providers", response_model=LLMProvider)
async def upsert_provider(provider: LLMProvider):
    # If the user sends a masked key (e.g. from UI update), fetching existing key to preserve it
    if provider.apiKey and "****" in provider.apiKey:
        existing = await config_service.get_provider(provider.id)
        if existing:
            provider.apiKey = existing.apiKey
            
    await config_service.add_provider(provider)
    return provider

@router.delete("/config/providers/{provider_id}")
async def delete_provider(provider_id: str):
    await config_service.delete_provider(provider_id)
    return {"status": "success"}

