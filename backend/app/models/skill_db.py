from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from uuid import uuid4

class SkillExecutionConfig(BaseModel):
    requiresApproval: bool = False # Human-in-the-loop: sensitive actions like delete
    mcpServerId: Optional[str] = None
    originalToolName: Optional[str] = None
    apiConfig: Optional[Dict[str, Any]] = None # For REST API skills: url, method, headers

class SkillConfig(BaseModel):
    id: str
    name: str
    description: str
    type: Literal["mcp", "api", "native"] # Source type
    source: str # e.g. "Filesystem MCP", "System Built-in"
    schema_definition: Dict[str, Any] # JSON Schema for tool parameters
    executionConfig: SkillExecutionConfig
    enabled: bool = True
    createdAt: datetime = Field(default_factory=datetime.now)
    updatedAt: datetime = Field(default_factory=datetime.now)

    def to_tool_definition(self):
        """Convert to OpenAI Tool format"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.schema_definition
            }
        }
