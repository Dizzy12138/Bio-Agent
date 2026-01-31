"""
外部论文 API 服务
封装 matai.zhijiucity.com 的论文服务 API
"""

import re
import httpx
from typing import Optional, Tuple
from app.models.bioextract import PaperMarkdownResponse, PaperPDFResponse


class PaperAPIService:
    """
    外部论文服务 API 客户端
    
    API 端点: http://matai.zhijiucity.com:36001/api/v1/papers/{paper_id}/{type}
    支持获取: markdown, pdf
    """
    
    BASE_URL = "http://matai.zhijiucity.com:36001/api/v1/papers"
    
    # 认证 Token (TODO: 考虑移到环境变量)
    AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYTdkYzEyN2EtNjk0OC00YWQ3LTg0NWQtMDA4ZDU4YWExN2YzIiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc3MTQ2OTQ1MH0.fut9oYGb4DYNLC8NA1GxI5QaSAbh-xRuEX38H1nxc2M"
    
    # Base64 图片正则匹配模式
    BASE64_IMAGE_PATTERN = re.compile(
        r'!\[([^\]]*)\]\(data:image/([^;]+);base64,([^\)]+)\)',
        re.MULTILINE
    )
    
    def __init__(self, timeout: float = 60.0):
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)
    
    async def close(self):
        """关闭 HTTP 客户端"""
        await self.client.aclose()
    
    def _get_headers(self, content_type: str = "markdown") -> dict:
        """获取请求头"""
        accept = "text/markdown, text/plain, */*" if content_type == "markdown" else "application/pdf, */*"
        return {
            "Authorization": self.AUTH_TOKEN,
            "Accept": accept
        }
    
    def _strip_base64_images(self, md_content: str) -> Tuple[str, int]:
        """
        从 Markdown 内容中去除所有 base64 图片
        
        Returns:
            Tuple[str, int]: (处理后的内容, 被移除的图片数量)
        """
        matches = list(self.BASE64_IMAGE_PATTERN.finditer(md_content))
        image_count = len(matches)
        
        if image_count == 0:
            return md_content, 0
        
        # 替换 base64 图片为占位符说明
        result = md_content
        for match in matches:
            alt_text = match.group(1) or "image"
            image_format = match.group(2)
            # 替换为简单的图片引用说明
            placeholder = f"[图片: {alt_text}] (格式: {image_format})"
            result = result.replace(match.group(0), placeholder, 1)
        
        return result, image_count
    
    async def get_paper_markdown(self, paper_id: str) -> PaperMarkdownResponse:
        """
        获取论文的 Markdown 内容（已去除 base64 图片）
        
        Args:
            paper_id: 论文 ID
            
        Returns:
            PaperMarkdownResponse: 包含处理后的 Markdown 内容
            
        Raises:
            httpx.HTTPStatusError: API 请求失败
        """
        url = f"{self.BASE_URL}/{paper_id}/markdown"
        headers = self._get_headers("markdown")
        
        response = await self.client.get(url, headers=headers)
        response.raise_for_status()
        
        raw_content = response.text
        
        # 去除 base64 图片
        processed_content, image_count = self._strip_base64_images(raw_content)
        
        return PaperMarkdownResponse(
            paper_id=paper_id,
            markdown_content=processed_content,
            has_images=image_count > 0,
            image_count=image_count,
            source_url=url
        )
    
    async def get_paper_markdown_raw(self, paper_id: str) -> str:
        """
        获取论文的原始 Markdown 内容（不处理 base64）
        
        Args:
            paper_id: 论文 ID
            
        Returns:
            str: 原始 Markdown 内容
        """
        url = f"{self.BASE_URL}/{paper_id}/markdown"
        headers = self._get_headers("markdown")
        
        response = await self.client.get(url, headers=headers)
        response.raise_for_status()
        
        return response.text
    
    async def get_paper_pdf_url(self, paper_id: str) -> PaperPDFResponse:
        """
        获取论文 PDF 的下载 URL
        
        注意：这个方法返回的是 URL，不是实际的 PDF 内容
        
        Args:
            paper_id: 论文 ID
            
        Returns:
            PaperPDFResponse: 包含 PDF URL
        """
        url = f"{self.BASE_URL}/{paper_id}/pdf"
        
        return PaperPDFResponse(
            paper_id=paper_id,
            pdf_url=url
        )
    
    async def download_paper_pdf(self, paper_id: str) -> bytes:
        """
        下载论文 PDF 内容
        
        Args:
            paper_id: 论文 ID
            
        Returns:
            bytes: PDF 文件内容
        """
        url = f"{self.BASE_URL}/{paper_id}/pdf"
        headers = self._get_headers("pdf")
        
        response = await self.client.get(url, headers=headers)
        response.raise_for_status()
        
        return response.content
    
    async def check_paper_exists(self, paper_id: str) -> bool:
        """
        检查论文是否存在于外部服务
        
        Args:
            paper_id: 论文 ID
            
        Returns:
            bool: 论文是否存在
        """
        url = f"{self.BASE_URL}/{paper_id}/markdown"
        headers = self._get_headers("markdown")
        
        try:
            response = await self.client.head(url, headers=headers)
            return response.status_code == 200
        except Exception:
            return False


# 创建全局服务实例
paper_api_service = PaperAPIService()
