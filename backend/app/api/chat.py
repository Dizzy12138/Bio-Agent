from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, Conversation, Message
from uuid import uuid4
import asyncio
import json

router = APIRouter()

from app.services.llm import llm_service
from app.services.chat_db import chat_service
from uuid import uuid4

from app.services.config_db import config_service

@router.post("/completions")
async def chat_completions(req: ChatRequest):
    # 1. Get or Create Conversation
    conversation_id = req.conversationId
    if not conversation_id:
        conversation_id = str(uuid4())
        new_conv = Conversation(
            id=conversation_id,
            title=req.message[:20] + "...", # Simple title generation
            expertId=req.expertId
        )
        await chat_service.create_conversation(new_conv)
    
    # 2. Save User Message
    user_msg = Message(
        id=str(uuid4()),
        role="user",
        content=req.message
    )
    await chat_service.add_message(conversation_id, user_msg)

    async def event_generator():
        # Retrieve context (fetch conversation for history if needed)
        
        # --- DYNAMIC AGENT LOADING ---
        system_prompt = "You are a helpful biomedical expert assistant."
        model = req.model or "gpt-3.5-turbo"
        temperature = req.temperature or 0.7
        
        if req.expertId:
            agent_config = await config_service.get_agent(req.expertId)
            if agent_config:
                system_prompt = agent_config.systemPrompt
                # Use agent's model if specified, otherwise use request model
                if hasattr(agent_config, 'model') and agent_config.model:
                    model = agent_config.model
            else:
                system_prompt += f" (Simulating expert ID: {req.expertId})"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": req.message}
        ]

        full_response = ""
        async for chunk in llm_service.stream_chat(messages, model=model, temperature=temperature):
             full_response += chunk
             yield f"data: {json.dumps({'content': chunk, 'conversationId': conversation_id})}\\n\\n"
        
        # 3. Save Assistant Message
        ai_msg = Message(
            id=str(uuid4()),
            role="assistant",
            content=full_response
        )
        await chat_service.add_message(conversation_id, ai_msg)
        
        yield "data: [DONE]\\n\\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/conversations", response_model=list[Conversation])
async def get_conversations():
    return await chat_service.get_conversations()

