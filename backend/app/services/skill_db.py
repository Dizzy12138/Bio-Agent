from app.db.mongo import mongodb
from app.models.skill_db import SkillConfig, SkillExecutionConfig
from typing import List, Optional, Dict
from datetime import datetime

# Built-in Native Skills
NATIVE_SKILLS = [
    SkillConfig(
        id="native-web-search",
        name="web_search",
        description="Search the internet for up-to-date information.",
        type="native",
        source="System Native",
        schema_definition={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query"}
            },
            "required": ["query"]
        },
        executionConfig=SkillExecutionConfig(requiresApproval=False),
        enabled=True
    ),
    SkillConfig(
        id="native-calculator",
        name="calculator",
        description="Perform mathematical calculations.",
        type="native",
        source="System Native",
        schema_definition={
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "Mathematical expression to evaluate (e.g., '2 + 2')"}
            },
            "required": ["expression"]
        },
        executionConfig=SkillExecutionConfig(requiresApproval=False),
        enabled=True
    ),
    SkillConfig(
        id="native-get-time",
        name="get_current_time",
        description="Get the current server time.",
        type="native",
        source="System Native",
        schema_definition={"type": "object", "properties": {}},
        executionConfig=SkillExecutionConfig(requiresApproval=False),
        enabled=True
    )
]

class SkillService:
    def collection(self):
        return mongodb.db["skills"]

    async def init_defaults(self):
        try:
            for skill in NATIVE_SKILLS:
                existing = await self.get_skill(skill.id)
                if not existing:
                    await self.collection().insert_one(skill.model_dump())
        except Exception as e:
            print(f"Skills init_defaults skipped (DB unavailable): {e}")

    async def get_skill(self, skill_id: str) -> Optional[SkillConfig]:
        doc = await self.collection().find_one({"id": skill_id})
        return SkillConfig(**doc) if doc else None

    async def get_all_skills(self) -> List[SkillConfig]:
        cursor = self.collection().find()
        return [SkillConfig(**doc) async for doc in cursor]

    async def update_skill(self, skill: SkillConfig):
        skill.updatedAt = datetime.now()
        await self.collection().replace_one({"id": skill.id}, skill.model_dump(), upsert=True)

    async def toggle_skill(self, skill_id: str, enabled: bool):
        await self.collection().update_one(
            {"id": skill_id}, 
            {"$set": {"enabled": enabled, "updatedAt": datetime.now()}}
        )

    # --- MCP Integration Stub ---
    async def sync_mcp_server(self, mcp_server_config):
        """
        Connect to MCP Server, list tools, and register them as Skills.
        This is a placeholder for actual MCP Protocol implementation.
        """
        # TODO: Implement MCP Client to fetch tools
        pass

skill_service = SkillService()
