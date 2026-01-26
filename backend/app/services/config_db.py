from app.db.mongo import mongodb
from app.models.config_db import AgentConfig, LLMProvider, MCPConfig, PromptTemplate
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

# Default Data
DEFAULT_AGENTS = [
    {
        "id": "expert-bio",
        "name": "Biomedical Literature Expert",
        "description": "Expert in analyzing biomedical papers and extracting entities.",
        "avatar": "🧬",
        "systemPrompt": "You are a Ph.D. level expert in biomedical engineering and synthetic biology. Analyze the user's query carefully.",
        "modelProviderId": "openai-default",
        "model": "gpt-4",
        "temperature": 0.3,
        "tools": ["search", "knowledge-base"],
        "createdAt": datetime.now(),
        "updatedAt": datetime.now()
    },
    {
        "id": "expert-general",
        "name": "General Assistant",
        "description": "General purpose helpful assistant.",
        "avatar": "🤖",
        "systemPrompt": "You are a helpful AI assistant.",
        "modelProviderId": "openai-default",
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "tools": [],
        "createdAt": datetime.now(),
        "updatedAt": datetime.now()
    }
]

DEFAULT_PROVIDERS = [
    {
        "id": "openai-default",
        "name": "OpenAI",
        "baseUrl": "https://api.openai.com/v1",
        "apiKey": None, # Will rely on ENV if None here
        "models": ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
        "isEnabled": True,
        "createdAt": datetime.now()
    }
]

class ConfigService:
    def col_agents(self): return mongodb.db["agents"]
    def col_providers(self): return mongodb.db["llm_providers"]
    def col_prompts(self): return mongodb.db["prompts"]
    def col_mcp(self): return mongodb.db["mcp_configs"]

    async def init_defaults(self):
        if await self.col_agents().count_documents({}) == 0:
            for a in DEFAULT_AGENTS: await self.col_agents().insert_one(a)
            
        if await self.col_providers().count_documents({}) == 0:
            for p in DEFAULT_PROVIDERS: await self.col_providers().insert_one(p)

    # --- Agents ---
    async def get_agent(self, agent_id: str) -> Optional[AgentConfig]:
        doc = await self.col_agents().find_one({"id": agent_id})
        return AgentConfig(**doc) if doc else None

    async def get_all_agents(self) -> List[AgentConfig]:
        cursor = self.col_agents().find()
        return [AgentConfig(**doc) async for doc in cursor]

    # --- Providers ---
    async def get_provider(self, provider_id: str) -> Optional[LLMProvider]:
        doc = await self.col_providers().find_one({"id": provider_id})
        return LLMProvider(**doc) if doc else None

    async def get_all_providers(self) -> List[LLMProvider]:
        cursor = self.col_providers().find()
        return [LLMProvider(**doc) async for doc in cursor]

    async def add_provider(self, provider: LLMProvider):
        # Check if exists
        existing = await self.get_provider(provider.id)
        if existing:
            await self.col_providers().replace_one({"id": provider.id}, provider.model_dump())
        else:
            await self.col_providers().insert_one(provider.model_dump())
        return provider

    async def delete_provider(self, provider_id: str):
        await self.col_providers().delete_one({"id": provider_id})

    # --- Prompts ---
    async def get_prompt(self, key: str) -> Optional[PromptTemplate]:
        doc = await self.col_prompts().find_one({"key": key})
        return PromptTemplate(**doc) if doc else None

config_service = ConfigService()
