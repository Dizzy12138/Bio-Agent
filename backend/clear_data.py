import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def clear_data():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    collections_to_clear = ["llm_providers", "agents", "ocr_tasks", "files", "skills"]
    
    print(f"Clearing collections: {collections_to_clear}")
    
    for col_name in collections_to_clear:
        count = await db[col_name].count_documents({})
        if count > 0:
            await db[col_name].drop()
            print(f"Dropped {col_name} ({count} documents)")
        else:
            print(f"Skipped {col_name} (empty)")
            
    client.close()
    print("Done.")

if __name__ == "__main__":
    asyncio.run(clear_data())
