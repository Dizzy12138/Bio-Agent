#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文献数据导入脚本

从外部 Paper API 下载论文的 PDF 和 Markdown，并将元数据存入 MongoDB。

Usage:
    python import_documents.py "path/to/文章分类-200.csv"
"""

import csv
import os
import re
import sys
import base64
import hashlib
import asyncio
import requests
from pathlib import Path
from typing import List, Tuple, Optional, Dict
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# =============================================
# Configuration
# =============================================

# External Paper API
API_BASE_URL = os.getenv("PAPER_API_BASE_URL", "http://matai.zhijiucity.com:36001/api/v1/papers")
# AUTH_TOKEN will be replaced by user
AUTH_TOKEN = os.getenv("PAPER_API_TOKEN", "Bearer YOUR_TOKEN_HERE")

# MongoDB
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "biomedical_agent")

# Output directory for files
BASE_DIR = Path(__file__).parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "papers"


# =============================================
# MongoDB Connection
# =============================================

class MongoConnection:
    def __init__(self):
        self.client = None
        self.db = None
    
    async def connect(self):
        self.client = AsyncIOMotorClient(MONGODB_URL)
        self.db = self.client[MONGODB_DB_NAME]
        print(f"[MongoDB] Connected to {MONGODB_DB_NAME}")
    
    async def close(self):
        if self.client:
            self.client.close()

mongo = MongoConnection()


# =============================================
# API Functions
# =============================================

def download_file(paper_id: str, file_type: str) -> Tuple[bool, Optional[bytes], Optional[str]]:
    """
    Download PDF or Markdown file from external API
    Returns: (success, content, filename)
    """
    url = f"{API_BASE_URL}/{paper_id}/{file_type}"
    headers = {
        "Authorization": AUTH_TOKEN,
        "Accept": f"application/{file_type}, */*" if file_type == "pdf" else "text/markdown, text/plain, */*"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=60)
        if response.status_code == 200:
            filename = f"{paper_id}.{file_type if file_type != 'markdown' else 'md'}"
            
            # Try to extract filename from Content-Disposition header
            if 'content-disposition' in response.headers:
                cd = response.headers['content-disposition']
                if 'filename=' in cd:
                    try:
                        filename = cd.split('filename=')[1].split(';')[0].strip('"\'')
                        if 'UTF-8' in cd:
                            import urllib.parse
                            filename = urllib.parse.unquote(filename)
                    except:
                        pass
            
            return True, response.content, filename
        else:
            print(f"    HTTP {response.status_code}")
            return False, None, None
    except Exception as e:
        print(f"    Error: {e}")
        return False, None, None


def extract_metadata_from_markdown(md_content: str, paper_id: str) -> Dict:
    """
    Extract document metadata from markdown content
    """
    metadata = {
        "id": paper_id,
        "title": "",
        "abstract": "",
        "authors": [],
        "keywords": [],
        "source": "matai-api",
        "type": "paper",
        "knowledgeBaseId": "kb-biomaterials",
        "status": "indexed",
        "fileType": "pdf",
    }
    
    lines = md_content.split('\n')
    
    # Try to extract title (first H1)
    for line in lines[:20]:  # Check first 20 lines
        if line.startswith('# '):
            metadata["title"] = line[2:].strip()
            break
    
    # If no title found, use paper_id
    if not metadata["title"]:
        metadata["title"] = f"Paper {paper_id}"
    
    # Try to extract abstract (look for "Abstract" section)
    abstract_started = False
    abstract_lines = []
    for line in lines:
        lower_line = line.lower().strip()
        if 'abstract' in lower_line and (lower_line.startswith('#') or lower_line == 'abstract'):
            abstract_started = True
            continue
        if abstract_started:
            if line.startswith('#') or len(abstract_lines) > 10:
                break
            if line.strip():
                abstract_lines.append(line.strip())
    
    if abstract_lines:
        metadata["abstract"] = ' '.join(abstract_lines)[:1000]  # Limit to 1000 chars
    
    return metadata


def extract_base64_images(md_content: str) -> List[Tuple[str, str, str, str]]:
    """
    Extract base64 images from markdown
    Returns: [(format, base64_data, full_match, alt_text), ...]
    """
    images = []
    pattern = r'!\[([^\]]*)\]\(data:image/([^;]+);base64,([^\)]+)\)'
    
    for match in re.finditer(pattern, md_content):
        alt_text = match.group(1)
        image_format = match.group(2)
        base64_data = match.group(3)
        full_match = match.group(0)
        images.append((image_format, base64_data, full_match, alt_text))
    
    return images


def save_base64_image(base64_data: str, image_format: str, output_dir: Path) -> str:
    """
    Save base64 image to file
    Returns: filename
    """
    hash_obj = hashlib.sha256(base64_data.encode()).hexdigest()[:16]
    filename = f"{hash_obj}.{image_format}"
    filepath = output_dir / filename
    
    image_data = base64.b64decode(base64_data)
    with open(filepath, 'wb') as f:
        f.write(image_data)
    
    return filename


# =============================================
# Main Import Logic
# =============================================

async def process_paper(paper_id: str) -> Optional[Dict]:
    """
    Process a single paper: download files and extract metadata
    Returns: document metadata or None
    """
    paper_id = paper_id.strip()
    if not paper_id:
        return None
    
    # Create output directory
    paper_dir = OUTPUT_DIR / paper_id
    paper_dir.mkdir(parents=True, exist_ok=True)
    images_dir = paper_dir / "images"
    images_dir.mkdir(exist_ok=True)
    
    metadata = None
    
    # Download PDF
    print(f"  Downloading PDF...", end=" ")
    pdf_ok, pdf_content, pdf_filename = download_file(paper_id, "pdf")
    if pdf_ok:
        pdf_path = paper_dir / f"{paper_id}.pdf"
        with open(pdf_path, 'wb') as f:
            f.write(pdf_content)
        pdf_size = len(pdf_content) / (1024 * 1024)
        print(f"✓ ({pdf_size:.2f} MB)")
    else:
        print("✗")
    
    # Download Markdown
    print(f"  Downloading Markdown...", end=" ")
    md_ok, md_content, md_filename = download_file(paper_id, "markdown")
    if md_ok:
        md_text = md_content.decode('utf-8', errors='ignore')
        
        # Extract metadata from markdown
        metadata = extract_metadata_from_markdown(md_text, paper_id)
        
        # Extract and replace base64 images
        images = extract_base64_images(md_text)
        if images:
            print(f"✓ ({len(images)} images)")
            for img_format, b64_data, full_match, alt_text in images:
                filename = save_base64_image(b64_data, img_format, images_dir)
                md_text = md_text.replace(full_match, f"![{alt_text}](images/{filename})", 1)
        else:
            print("✓")
        
        # Save processed markdown
        md_path = paper_dir / f"{paper_id}.md"
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md_text)
        
        # Add file paths to metadata
        metadata["pdfPath"] = str(paper_dir / f"{paper_id}.pdf")
        metadata["markdownPath"] = str(md_path)
    else:
        print("✗")
    
    return metadata


async def save_document_to_mongo(doc: Dict):
    """
    Save document metadata to MongoDB
    """
    doc["createdAt"] = datetime.now()
    doc["updatedAt"] = datetime.now()
    
    await mongo.db["documents"].update_one(
        {"id": doc["id"]},
        {"$set": doc},
        upsert=True
    )


def read_paper_ids(csv_file: Path) -> List[str]:
    """Read paper_id list from CSV file"""
    paper_ids = []
    try:
        with open(csv_file, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                paper_id = row.get('paper_id', '').strip()
                if paper_id and paper_id != 'paper_id':
                    paper_ids.append(paper_id)
    except Exception as e:
        print(f"Error reading CSV: {e}")
    return paper_ids


async def main():
    """Main entry point"""
    print("=" * 60)
    print("文献数据导入工具")
    print("=" * 60)
    
    # Check command line args
    if len(sys.argv) < 2:
        print("Usage: python import_documents.py <csv_file>")
        print("Example: python import_documents.py '文章分类-200.csv'")
        sys.exit(1)
    
    csv_file = Path(sys.argv[1])
    if not csv_file.exists():
        print(f"Error: CSV file not found: {csv_file}")
        sys.exit(1)
    
    # Read paper IDs
    paper_ids = read_paper_ids(csv_file)
    print(f"\nFound {len(paper_ids)} papers in CSV")
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Connect to MongoDB
    await mongo.connect()
    
    # Process papers
    print("\n" + "=" * 60)
    print("Starting import...")
    print("=" * 60)
    
    success_count = 0
    fail_count = 0
    
    for i, paper_id in enumerate(paper_ids, 1):
        print(f"\n[{i}/{len(paper_ids)}] {paper_id}")
        
        try:
            metadata = await process_paper(paper_id)
            if metadata:
                await save_document_to_mongo(metadata)
                success_count += 1
                print(f"  → Saved: {metadata.get('title', 'Unknown')[:50]}...")
            else:
                fail_count += 1
        except Exception as e:
            print(f"  Error: {e}")
            fail_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("Import Complete!")
    print("=" * 60)
    print(f"Success: {success_count}/{len(paper_ids)}")
    print(f"Failed: {fail_count}")
    print(f"\nFiles saved to: {OUTPUT_DIR}")
    
    # Close MongoDB
    await mongo.close()


if __name__ == "__main__":
    asyncio.run(main())
