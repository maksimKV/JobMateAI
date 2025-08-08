import os
import re
import json
import pdfplumber
from docx import Document
from typing import Dict, Any, List, Optional, Set, TypedDict, Literal, Union, BinaryIO
import aiofiles
import uuid
import logging
from pathlib import Path

# Load skills database
SKILLS_DB_PATH = Path(__file__).parent.parent / 'data' / 'skills_database.json'

def load_skills_database() -> Dict[str, List[str]]:
    """Load and return the skills database."""
    try:
        with open(SKILLS_DB_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load skills database: {e}")
        return {}

def generate_skill_pattern(skill: str) -> str:
    """Generate a regex pattern for a skill name with special cases."""
    # Handle special cases that need custom patterns
    special_cases = {
        'c++': r'c\+\+',
        'c#': r'c#|csharp',
        '.net core': r'\.net\s*core|dotnet\s*core|dotnetcore',
        'node.js': r'node(?:\.js)?|nodejs',
        'next.js': r'next(?:\.js)?|nextjs',
        'nuxt.js': r'nuxt(?:\.js)?|nuxtjs',
        'amazon web services': r'amazon\s*web\s*services|aws',
        'google cloud': r'google\s*cloud|gcp',
        'ruby on rails': r'ruby\s*on\s*rails|rails|ror',
        'machine learning': r'machine\s*learning|ml\b',
        'deep learning': r'deep\s*learning|dl\b',
        'data science': r'data\s*science',
        'data analysis': r'data\s*analysis',
        'artificial intelligence': r'artificial\s*intelligence|ai\b',
        'natural language processing': r'natural\s*language\s*processing|nlp\b',
        'computer vision': r'computer\s*vision|cv\b',
        'microsoft office': r'microsoft\s*office|ms\s*office|msoffice',
        'power bi': r'power\s*bi|powerbi',
        'powerpoint': r'power\s*point|powerpoint',
        'sql server': r'sql\s*server|mssql',
        'postgresql': r'postgresql|postgres|postgre\s*sql',
        'mongodb': r'mongodb|mongo',
        'react': r'react(?:\.js)?|reactjs',
        'angular': r'angular(?:\.js)?|angularjs',
        'vue': r'vue(?:\.js)?|vuejs',
        'express': r'express(?:\.js)?|expressjs',
        'typescript': r'typescript|ts\b',
        'javascript': r'javascript|js\b',
        'html': r'html(?:\s*5)?',
        'css': r'css(?:\s*3)?',
        'sass': r'sass|scss',
        'tensorflow': r'tensorflow|tf\b',
        'pytorch': r'pytorch|torch',
        'scikit-learn': r'scikit\s*-?\s*learn|sklearn',
        'matplotlib': r'matplotlib|plt\b',
        'jupyter': r'jupyter(?:\s*notebook)?',
        'github actions': r'github\s*actions|gha\b',
        'gitlab ci/cd': r'gitlab\s*ci/cd|gitlab\s*pipelines',
        'kubernetes': r'kubernetes|k8s',
        'amazon web services': r'amazon\s*web\s*services|aws',
        'google cloud': r'google\s*cloud|gcp',
        'microsoft azure': r'microsoft\s*azure|azure',
        'artificial intelligence': r'artificial\s*intelligence|ai\b',
        'machine learning': r'machine\s*learning|ml\b',
        'natural language processing': r'natural\s*language\s*processing|nlp\b',
        'computer vision': r'computer\s*vision|cv\b',
        'data science': r'data\s*science',
        'data analysis': r'data\s*analysis',
        'business intelligence': r'business\s*intelligence|bi\b',
        'user interface': r'user\s*interface|ui\b',
        'user experience': r'user\s*experience|ux\b',
        'user interface/experience': r'user\s*interface/experience|ui/ux',
        'responsive design': r'responsive\s*design|responsive',
        'test-driven development': r'test\s*-?\s*driven\s*development|tdd\b',
        'behavior-driven development': r'behavior\s*-?\s*driven\s*development|bdd\b',
        'domain-driven design': r'domain\s*-?\s*driven\s*design|ddd\b',
        'representational state transfer': r'representational\s*state\s*transfer|rest\b',
        'graphql': r'graphql|gql\b',
        'restful api': r'rest(?:ful)?\s*api|rest\b',
        'application programming interface': r'application\s*programming\s*interface|api\b',
        'object-oriented programming': r'object\s*-?\s*oriented\s*programming|oop\b',
        'functional programming': r'functional\s*programming|fp\b',
        'aspect-oriented programming': r'aspect\s*-?\s*oriented\s*programming|aop\b',
        'service-oriented architecture': r'service\s*-?\s*oriented\s*architecture|soa\b',
        'microservices': r'micro\s*-?\s*services|microservices',
        'serverless': r'server\s*-?\s*less|serverless',
        'internet of things': r'internet\s*of\s*things|iot\b',
        'blockchain': r'block\s*-?\s*chain|blockchain',
        'quantum computing': r'quantum\s*computing|qc\b',
        'augmented reality': r'augmented\s*reality|ar\b',
        'virtual reality': r'virtual\s*reality|vr\b',
        'mixed reality': r'mixed\s*reality|mr\b',
        'extended reality': r'extended\s*reality|xr\b',
        'internet of things': r'internet\s*of\s*things|iot\b',
        'industrial internet of things': r'industrial\s*internet\s*of\s*things|iiot\b',
        'internet of medical things': r'internet\s*of\s*medical\s*things|iomt\b',
        'internet of everything': r'internet\s*of\s*everything|ioe\b',
        'cybersecurity': r'cyber\s*-?\s*security|cybersecurity',
        'information security': r'information\s*security|infosec',
        'cloud security': r'cloud\s*security',
        'network security': r'network\s*security',
        'application security': r'application\s*security|appsec',
        'devsecops': r'devsecops|dev\s*sec\s*ops',
        'microsoft office': r'microsoft\s*office|ms\s*office|msoffice',
        'microsoft excel': r'microsoft\s*excel|ms\s*excel|excel',
        'microsoft word': r'microsoft\s*word|ms\s*word|word',
        'microsoft powerpoint': r'microsoft\s*powerpoint|ms\s*powerpoint|powerpoint|power\s*point',
        'microsoft outlook': r'microsoft\s*outlook|ms\s*outlook|outlook',
        'microsoft teams': r'microsoft\s*teams|ms\s*teams|teams',
        'microsoft azure': r'microsoft\s*azure|azure',
        'microsoft 365': r'microsoft\s*365|ms\s*365|office\s*365',
        'google workspace': r'google\s*workspace|g\s*suite|gsuite',
        'google docs': r'google\s*docs|gdocs',
        'google sheets': r'google\s*sheets|gsheets',
        'google slides': r'google\s*slides|gslides',
        'google drive': r'google\s*drive|gdrive',
        'google cloud platform': r'google\s*cloud\s*platform|gcp',
        'amazon web services': r'amazon\s*web\s*services|aws',
        'amazon s3': r'amazon\s*s3|aws\s*s3|s3',
        'amazon ec2': r'amazon\s*ec2|aws\s*ec2|ec2',
        'amazon rds': r'amazon\s*rds|aws\s*rds|rds',
        'amazon lambda': r'amazon\s*lambda|aws\s*lambda|lambda',
        'amazon dynamodb': r'amazon\s*dynamodb|aws\s*dynamodb|dynamodb',
        'amazon api gateway': r'amazon\s*api\s*gateway|aws\s*api\s*gateway|api\s*gateway',
        'amazon cloudfront': r'amazon\s*cloudfront|aws\s*cloudfront|cloudfront',
        'amazon route 53': r'amazon\s*route\s*53|aws\s*route\s*53|route\s*53',
        'amazon cloudwatch': r'amazon\s*cloudwatch|aws\s*cloudwatch|cloudwatch',
        'amazon elasticache': r'amazon\s*elasticache|aws\s*elasticache|elasticache',
        'amazon elasticsearch': r'amazon\s*elasticsearch|aws\s*elasticsearch|elasticsearch',
        'amazon kinesis': r'amazon\s*kinesis|aws\s*kinesis|kinesis',
        'amazon redshift': r'amazon\s*redshift|aws\s*redshift|redshift',
        'amazon sagemaker': r'amazon\s*sagemaker|aws\s*sagemaker|sagemaker',
        'amazon sqs': r'amazon\s*sqs|aws\s*sqs|sqs',
        'amazon sns': r'amazon\s*sns|aws\s*sns|sns',
        'amazon ses': r'amazon\s*ses|aws\s*ses|ses',
        'amazon ssm': r'amazon\s*ssm|aws\s*ssm|ssm',
        'amazon vpc': r'amazon\s*vpc|aws\s*vpc|vpc',
        'amazon iam': r'amazon\s*iam|aws\s*iam|iam',
        'amazon cognito': r'amazon\s*cognito|aws\s*cognito|cognito',
        'amazon kms': r'amazon\s*kms|aws\s*kms|kms',
        'amazon cloudformation': r'amazon\s*cloudformation|aws\s*cloudformation|cloudformation',
        'amazon cloudtrail': r'amazon\s*cloudtrail|aws\s*cloudtrail|cloudtrail',
        'amazon config': r'amazon\s*config|aws\s*config|awsconfig',
        'amazon guardduty': r'amazon\s*guardduty|aws\s*guardduty|guardduty',
        'amazon inspector': r'amazon\s*inspector|aws\s*inspector|inspector',
        'amazon macie': r'amazon\s*macie|aws\s*macie|macie',
        'amazon security hub': r'amazon\s*security\s*hub|aws\s*security\s*hub|security\s*hub',
        'amazon shield': r'amazon\s*shield|aws\s*shield|shield',
        'amazon waf': r'amazon\s*waf|aws\s*waf|waf',
        'amazon detective': r'amazon\s*detective|aws\s*detective|detective',
        'amazon guardduty': r'amazon\s*guardduty|aws\s*guardduty|guardduty',
        'amazon inspector': r'amazon\s*inspector|aws\s*inspector|inspector',
        'amazon macie': r'amazon\s*macie|aws\s*macie|macie',
        'amazon security hub': r'amazon\s*security\s*hub|aws\s*security\s*hub|security\s*hub',
        'amazon shield': r'amazon\s*shield|aws\s*shield|shield',
        'amazon waf': r'amazon\s*waf|aws\s*waf|waf',
        'amazon detective': r'amazon\s*detective|aws\s*detective|detective',
        'amazon guardduty': r'amazon\s*guardduty|aws\s*guardduty|guardduty',
        'amazon inspector': r'amazon\s*inspector|aws\s*inspector|inspector',
        'amazon macie': r'amazon\s*macie|aws\s*macie|macie',
        'amazon security hub': r'amazon\s*security\s*hub|aws\s*security\s*hub|security\s*hub',
        'amazon shield': r'amazon\s*shield|aws\s*shield|shield',
        'amazon waf': r'amazon\s*waf|aws\s*waf|waf',
        'amazon detective': r'amazon\s*detective|aws\s*detective|detective',
        'amazon guardduty': r'amazon\s*guardduty|aws\s*guardduty|guardduty',
        'amazon inspector': r'amazon\s*inspector|aws\s*inspector|inspector',
        'amazon macie': r'amazon\s*macie|aws\s*macie|macie',
        'amazon security hub': r'amazon\s*security\s*hub|aws\s*security\s*hub|security\s*hub',
        'amazon shield': r'amazon\s*shield|aws\s*shield|shield',
        'amazon waf': r'amazon\s*waf|aws\s*waf|waf',
        'amazon detective': r'amazon\s*detective|aws\s*detective|detective',
    }
    
    # Check for special cases first
    lower_skill = skill.lower()
    if lower_skill in special_cases:
        return special_cases[lower_skill]
    
    # Generate a basic pattern with word boundaries
    escaped = re.escape(skill.lower())
    # Replace spaces with optional whitespace
    pattern = r'\b' + escaped.replace(r'\ ', r'\s+') + r'\b'
    return pattern

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
        """Extract potential skills from resume text with flexible matching.
        
        Args:
            text: The text to extract skills from
            
        Returns:
            List of extracted skills (lowercase, sorted, unique)
        """
        # Load skills from the centralized database
        skills_db = load_skills_database()
        
        # Flatten all skills from all categories into a single list
        all_skills = []
        for category in skills_db.values():
            all_skills.extend(category)
        
        # Remove duplicates while preserving order
        unique_skills = []
        seen = set()
        for skill in all_skills:
            if skill.lower() not in seen:
                seen.add(skill.lower())
                unique_skills.append(skill)
        
        # Generate patterns for each skill and search in text
        found_skills = set()
        text_lower = text.lower()
        
        for skill in unique_skills:
            pattern = generate_skill_pattern(skill)
            if re.search(pattern, text_lower, re.IGNORECASE):
                found_skills.add(skill.lower())
        
        logger.debug(f"Extracted {len(found_skills)} skills from text")
        return sorted(list(found_skills))