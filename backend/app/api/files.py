from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List
from app.models.files import UploadFileRecord, OCRTask, TaskStatus
from uuid import uuid4
import shutil
import os
from datetime import datetime
import asyncio
import httpx

router = APIRouter()

from app.db.mongo import mongodb

# --- Database Access Helpers ---
def get_files_collection():
    return mongodb.db["files"]

def get_tasks_collection():
    return mongodb.db["ocr_tasks"]

# Ensure upload dir exists
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/files/upload", response_model=UploadFileRecord)
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")
    
    # Create record
    record = UploadFileRecord(
        id=file_id,
        filename=file.filename,
        originalName=file.filename,
        contentType=file.content_type or "application/octet-stream",
        size=os.path.getsize(file_path),
        path=file_path
    )
    
    # Save to DB
    await get_files_collection().insert_one(record.model_dump())
    
    return record

@router.get("/files/{file_id}")
async def get_file(file_id: str):
    doc = await get_files_collection().find_one({"id": file_id})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    record = UploadFileRecord(**doc)
    
    if not os.path.exists(record.path):
         raise HTTPException(status_code=404, detail="Physical file not found")
         
    return FileResponse(record.path, filename=record.originalName)

# --- OCR Tasks ---

async def update_task_status(task_id: str, updates: dict):
    updates["updatedAt"] = datetime.now()
    await get_tasks_collection().update_one(
        {"id": task_id},
        {"$set": updates}
    )

from app.services.vector_db import vector_service

import re
import base64

def image_to_base64(image_path: str) -> str:
    """Read image file and convert to Base64 data URI."""
    mime_type = "image/png"
    if image_path.lower().endswith(".jpg") or image_path.lower().endswith(".jpeg"):
        mime_type = "image/jpeg"
        
    try:
        with open(image_path, "rb") as img_file:
            b64_data = base64.b64encode(img_file.read()).decode('utf-8')
            return f"data:{mime_type};base64,{b64_data}"
    except Exception as e:
        print(f"Error converting image {image_path}: {e}")
        return "" # Return empty or original path on error

def embed_images_in_markdown(markdown_text: str, base_dir: str) -> str:
    """Find all image links in markdown and replace with Base64."""
    # Regex to find ![alt](path)
    pattern = r'!\[(.*?)\]\((.*?)\)'
    
    def replace_match(match):
        alt_text = match.group(1)
        img_path = match.group(2)
        
        # If already data URI or http link, skip
        if img_path.startswith("data:") or img_path.startswith("http"):
            return match.group(0)
            
        # Construct full path (MinerU usually outputs relative paths or we know the dir)
        full_path = os.path.join(base_dir, img_path)
        
        # Check if file exists
        if os.path.exists(full_path):
            base64_img = image_to_base64(full_path)
            if base64_img:
                return f"![{alt_text}]({base64_img})"
        
        return match.group(0)

    return re.sub(pattern, replace_match, markdown_text)

import zipfile
import io

# ... (Previous helper functions: image_to_base64, embed_images_in_markdown)

# Background worker
async def process_ocr_task(task_id: str, file_path: str):
    await update_task_status(task_id, {"status": TaskStatus.PROCESSING, "progress": 10})
    
    try:
        output_dir = os.path.join(UPLOAD_DIR, f"{task_id}_output")
        os.makedirs(output_dir, exist_ok=True)
        final_markdown = ""
        
        # Switch: Use Real MinerU or Mock?
        # In production, check env var or config
        use_mock = os.getenv("USE_MOCK_OCR", "True").lower() == "true"
        
        if use_mock:
            # --- MOCK PATH ---
            await asyncio.sleep(2) 
            
            # 1. Create dummy image
            img_filename = "figure1.png"
            img_full_path = os.path.join(output_dir, img_filename)
            red_dot_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
            with open(img_full_path, "wb") as f:
                f.write(base64.b64decode(red_dot_b64))
                
            # 2. Generate Markdown
            raw_markdown = f"""# Mock OCR Result (Simulated)
## Analysis
Extracted data shows significant correlation.
![Correlation Graph]({img_filename})
*Figure 1: Generated from local disk file.*
"""
            # 3. Embed Images
            final_markdown = embed_images_in_markdown(raw_markdown, output_dir)
            
        else:
            # --- REAL MINERU PATH ---
            mineru_url = os.getenv("MINERU_API_URL", "http://host.docker.internal:30000/file_parse")
            
            async with httpx.AsyncClient() as client:
                with open(file_path, "rb") as f:
                    response = await client.post(
                        mineru_url,
                        files={"file": f},
                        timeout=300 # OCR can be slow
                    )
                    
                if response.status_code != 200:
                    raise Exception(f"MinerU API failed: {response.text}")
                
                # Assume MinerU returns JSON with a 'result' key containing markdown 
                # OR returns a ZIP file containing 'output_dir' structure.
                # Adjust based on specific MinerU API version. 
                # Here assuming it returns a JSON response containing 'result' dictionary with 'markdown' content 
                # AND potentially images separate or embedded? 
                # Actually, standard Magic-PDF returns a JSON with 'status' and download links, OR direct content.
                # FOR DEMO: We assume it might return a ZIP/JSON. 
                # Let's handle the case where we fetch the result content.
                
                # MVP Logic: Just assume we get JSON text for now, 
                # But for images to work, we need the images.
                # If MinerU is deployed as extraction service, it usually writes to shared storage or returns zip.
                # Let's placeholder this with the assumption of zip response for full content:
                
                # if response.headers['content-type'] == 'application/zip':
                #    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                #        z.extractall(output_dir)
                #    # Read md file
                #    # final_markdown = embed_images_in_markdown(md_content, output_dir)
                
                # Fallback to text if simple API
                data = response.json()
                final_markdown = data.get("result", {}).get("markdown", "")
                # If images are returned as URLs, embed_images_in_markdown needs to handle downloading them?
                # Currently our embed function handles LOCAL files.
                # So Real MinerU requires shared volume or Zip download.
                
                pass 

        await update_task_status(task_id, {
            "status": TaskStatus.COMPLETED,
            "progress": 100,
            "result": {
                "markdown": final_markdown,
                "tables": []
            }
        })
            
        # Ingest to Vector DB
        task_doc = await get_tasks_collection().find_one({"id": task_id})
        if task_doc and final_markdown:
             await vector_service.ingest_document(task_doc['fileId'], final_markdown)
        
    except Exception as e:
        await update_task_status(task_id, {
            "status": TaskStatus.FAILED,
            "error": str(e)
        })

@router.post("/ocr/tasks", response_model=OCRTask)
async def create_ocr_task(file_id: str, background_tasks: BackgroundTasks):
    # Check file
    file_doc = await get_files_collection().find_one({"id": file_id})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_record = UploadFileRecord(**file_doc)
    
    task_id = str(uuid4())
    task = OCRTask(
        id=task_id,
        fileId=file_id,
        status=TaskStatus.PENDING
    )
    
    await get_tasks_collection().insert_one(task.model_dump())
    
    background_tasks.add_task(process_ocr_task, task_id, file_record.path)
    
    return task

@router.get("/ocr/tasks/{task_id}", response_model=OCRTask)
async def get_ocr_task(task_id: str):
    doc = await get_tasks_collection().find_one({"id": task_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    return OCRTask(**doc)
