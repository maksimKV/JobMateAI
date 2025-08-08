import os
import re
import pdfplumber
from docx import Document
from typing import Dict, Any, List, Optional, Set, TypedDict, Literal, Union, BinaryIO
import aiofiles
import uuid
import logging
from pathlib import Path

# Type definitions for better type hints
class ResumeSections(TypedDict):
    """Structure for resume section analysis results."""
    has_contact_info: bool
    has_education: bool
    has_experience: bool
    has_skills: bool
    has_projects: bool
    has_certifications: bool
    missing_sections: List[str]

class ParsedResume(TypedDict):
    """Structure of the parsed resume data."""
    raw_text: str
    sections: ResumeSections
    file_path: str
    file_type: str
    word_count: int
    character_count: int

# Set up logging
logger = logging.getLogger(__name__)

class FileParser:
    """Utility class for parsing different file formats (PDF, DOCX)"""
    
    @staticmethod
    async def save_uploaded_file(file_content: bytes, filename: str) -> str:
        """Save uploaded file to disk and return the file path."""
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_ext = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        return file_path
    
    @staticmethod
    def extract_text_from_pdf(file_path: Union[str, os.PathLike]) -> str:
        """Extract text from PDF file using pdfplumber.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text as string
            
        Raises:
            ValueError: If text extraction fails
        """
        text = ""
        
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            if not text.strip():
                raise ValueError("PDF appears to be empty or contains no extractable text")
                
            return text.strip()
            
        except Exception as e:
            error_msg = f"Failed to extract text from PDF: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e
    
    @staticmethod
    def extract_text_from_docx(file_path: Union[str, os.PathLike]) -> str:
        """Extract text from DOCX file.
        
        Args:
            file_path: Path to the DOCX file
            
        Returns:
            Extracted text as string
            
        Raises:
            ValueError: If text extraction fails
        """
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            if not text.strip():
                raise ValueError("DOCX appears to be empty or contains no extractable text")
                
            return text.strip()
            
        except Exception as e:
            error_msg = f"Failed to extract text from DOCX: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e
    
    @staticmethod
    def parse_resume(file_path: Union[str, os.PathLike]) -> ParsedResume:
        """Parse resume file and extract structured information."""
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            text = FileParser.extract_text_from_pdf(file_path)
        elif file_ext == '.docx':
            text = FileParser.extract_text_from_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        if not text.strip():
            raise ValueError("No text could be extracted from the file")
        
        # Basic structure analysis
        sections = FileParser._analyze_resume_structure(text)
        
        return {
            "raw_text": text,
            "sections": sections,
            "file_path": file_path,
            "file_type": file_ext,
            "word_count": len(text.split()),
            "character_count": len(text)
        }
    
    @staticmethod
    def _analyze_resume_structure(text: str) -> ResumeSections:
        """Analyze resume structure and identify sections."""
        text_lower = text.lower()
        sections = {
            "has_contact_info": False,
            "has_education": False,
            "has_experience": False,
            "has_skills": False,
            "has_projects": False,
            "has_certifications": False,
            "missing_sections": []
        }
        
        # Check for common section headers
        contact_indicators = ['email', 'phone', 'linkedin', 'github', 'website']
        education_indicators = ['education', 'academic', 'degree', 'university', 'college']
        experience_indicators = ['experience', 'work history', 'employment', 'career']
        skills_indicators = ['skills', 'technologies', 'programming', 'languages']
        project_indicators = ['projects', 'portfolio', 'achievements']
        certification_indicators = ['certifications', 'certificates', 'awards']
        
        # Check for contact information
        if any(indicator in text_lower for indicator in contact_indicators):
            sections["has_contact_info"] = True
        
        # Check for education section
        if any(indicator in text_lower for indicator in education_indicators):
            sections["has_education"] = True
        
        # Check for experience section
        if any(indicator in text_lower for indicator in experience_indicators):
            sections["has_experience"] = True
        
        # Check for skills section
        if any(indicator in text_lower for indicator in skills_indicators):
            sections["has_skills"] = True
        
        # Check for projects section
        if any(indicator in text_lower for indicator in project_indicators):
            sections["has_projects"] = True
        
        # Check for certifications section
        if any(indicator in text_lower for indicator in certification_indicators):
            sections["has_certifications"] = True
        
        # Identify missing sections
        if not sections["has_contact_info"]:
            sections["missing_sections"].append("Contact Information")
        if not sections["has_education"]:
            sections["missing_sections"].append("Education")
        if not sections["has_experience"]:
            sections["missing_sections"].append("Work Experience")
        if not sections["has_skills"]:
            sections["missing_sections"].append("Skills")
        if not sections["has_projects"]:
            sections["missing_sections"].append("Projects")
        if not sections["has_certifications"]:
            sections["missing_sections"].append("Certifications")
        
        return sections
    
    @staticmethod
    def extract_skills_from_text(
        text: str, 
        language: str = 'en',
        min_skill_length: int = 2,
        max_skill_length: int = 50
    ) -> List[str]:
        """Extract potential skills from resume text with word boundary checking.
        
        Args:
            text: The text to extract skills from
            language: Language code for skill extraction (default: 'en')
            
        Returns:
            List of unique, matched skills
        """
        # Common programming languages and technologies with word boundaries
        common_skills = {
            'python': r'\bpython\b',
            'javascript': r'\bjavascript\b|\bjs\b',
            'java': r'\bjava\b(?!script\b)',  # Match 'java' but not 'javascript'
            'c++': r'\bc\+\+\b',
            'c#': r'\bc#\b|\bcsharp\b',
            'php': r'\bphp\b',
            'ruby': r'\bruby\b',
            'go': r'\bgo\b|\bgolang\b',
            'rust': r'\brust\b',
            'react': r'\breact\b|\breact\.?js\b',
            'angular': r'\bangular\b',
            'vue': r'\bvue\b|\bvue\.?js\b',
            'node.js': r'\bnode\.?js\b|\bnode\b',
            'express': r'\bexpress\b|\bexpress\.?js\b',
            'django': r'\bdjango\b',
            'flask': r'\bflask\b',
            'mysql': r'\bmysql\b',
            'postgresql': r'\bpostgresql\b|\bpostgres\b',
            'mongodb': r'\bmongodb\b',
            'redis': r'\bredis\b',
            'elasticsearch': r'\belasticsearch\b|\belastic\s*search\b',
            'aws': r'\baws\b|\bamazon\s*web\s*services\b',
            'azure': r'\bazure\b|\bmicrosoft\s*azure\b',
            'gcp': r'\bgcp\b|\bgoogle\s*cloud\s*platform\b',
            'docker': r'\bdocker\b',
            'kubernetes': r'\bkubernetes\b|\bk8s\b',
            'jenkins': r'\bjenkins\b',
            'git': r'\bgit\b',
            'html': r'\bhtml\s*5?\b',
            'css': r'\bcss\s*3?\b',
            'sass': r'\bsass\b|\bscss\b',
            'less': r'\bless\b',
            'typescript': r'\btypescript\b|\bts\b',
            'jquery': r'\bjquery\b',
            'bootstrap': r'\bbootstrap\b',
            'machine learning': r'\bmachine\s*learning\b|\bml\b',
            'ai': r'\bai\b|\bartificial\s*intelligence\b',
            'data science': r'\bdata\s*science\b',
            'pandas': r'\bpandas\b',
            'numpy': r'\bnumpy\b',
            'tensorflow': r'\btensorflow\b|\btf\b',
            'agile': r'\bagile\b',
            'scrum': r'\bscrum\b',
            'kanban': r'\bkanban\b',
            'jira': r'\bjira\b',
            'confluence': r'\bconfluence\b',
            'slack': r'\bslack\b'
        }
        
        found_skills: Set[str] = set()
        text_lower = text.lower()
        
        for skill, pattern in common_skills.items():
            if re.search(pattern, text_lower, re.IGNORECASE):
                found_skills.add(skill)
        
        logger.debug(f"Extracted {len(found_skills)} skills from text")
        return sorted(list(found_skills))