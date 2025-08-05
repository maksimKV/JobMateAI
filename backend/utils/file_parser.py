import os
import pdfplumber
from docx import Document
from typing import Dict, Any, Optional
import aiofiles
import uuid

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
    def extract_text_from_pdf(file_path: str) -> str:
        """Extract text from PDF file using pdfplumber."""
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
            print(error_msg)
            raise ValueError(error_msg) from e
    
    @staticmethod
    def extract_text_from_docx(file_path: str) -> str:
        """Extract text from DOCX file."""
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            print(f"Error extracting text from DOCX: {e}")
            return ""
    
    @staticmethod
    def parse_resume(file_path: str) -> Dict[str, Any]:
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
    def _analyze_resume_structure(text: str) -> Dict[str, Any]:
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
    def extract_skills_from_text(text: str) -> list:
        """Extract potential skills from resume text."""
        # Common programming languages and technologies
        common_skills = [
            'python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
            'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask',
            'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
            'html', 'css', 'sass', 'less', 'typescript', 'jquery', 'bootstrap',
            'machine learning', 'ai', 'data science', 'pandas', 'numpy', 'tensorflow',
            'agile', 'scrum', 'kanban', 'jira', 'confluence', 'slack'
        ]
        
        text_lower = text.lower()
        found_skills = []
        
        for skill in common_skills:
            if skill in text_lower:
                found_skills.append(skill)
        
        return found_skills 