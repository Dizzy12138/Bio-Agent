from fastapi import APIRouter, HTTPException, Body
from typing import List
from app.models.skill_db import SkillConfig
from app.services.skill_db import skill_service

router = APIRouter()

@router.on_event("startup")
async def startup_event():
    await skill_service.init_defaults()

@router.get("/config/skills", response_model=List[SkillConfig])
async def get_skills():
    return await skill_service.get_all_skills()

@router.post("/config/skills/{skill_id}/toggle")
async def toggle_skill(skill_id: str, enabled: bool = Body(..., embed=True)):
    skill = await skill_service.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    await skill_service.toggle_skill(skill_id, enabled)
    return {"status": "success", "enabled": enabled}

@router.post("/config/skills/reset")
async def reset_skills():
    await skill_service.init_defaults()
    return {"status": "success", "message": "Default skills restored"}

@router.post("/config/skills", response_model=SkillConfig)
async def add_skill(skill: SkillConfig):
    # Check if exists
    existing = await skill_service.get_skill(skill.id)
    if existing:
        raise HTTPException(status_code=400, detail="Skill ID already exists")
        
    await skill_service.update_skill(skill)
    return skill
