from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Set
import re
import logging
import json
from utils.ai_client import ai_client
from routers.cv_analyzer import cv_storage
from utils.file_parser import FileParser

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

def extract_skills_from_text(job_info: Dict[str, Any]) -> Dict[str, List[str]]:
    """Extract skills from the job info dictionary structure or raw text."""
    logger.info(f"Extracting skills from job info")
    skills = set()
    tech_skills = set()
    soft_skills = set()
    
    # Common technical terms to look for
    tech_keywords = [
        'html', 'css', 'javascript', 'typescript', 'react', 'node', 'bootstrap', 
        'aws', 'python', 'java', 'c#', 'c++', 'sql', 'nosql', 'mongodb', 'postgresql',
        'mysql', 'git', 'docker', 'kubernetes', 'rest', 'api', 'graphql', 'grpc',
        'microservices', 'mvc', 'mvvm', 'oop', 'design patterns', 'agile', 'scrum',
        'ci/cd', 'tdd', 'jest', 'mocha', 'junit', 'selenium', 'jenkins', 'github actions',
        'azure', 'google cloud', 'firebase', 'heroku', 'netlify', 'vercel', 'django',
        'flask', 'express', 'spring boot', 'asp.net', 'ruby on rails', 'laravel',
        'symfony', 'angular', 'vue', 'svelte', 'jquery', 'redux', 'mobx', 'apollo',
        'webpack', 'babel', 'eslint', 'prettier', 'flow', 'jasmine', 'cypress',
        'storybook', 'styled components', 'tailwind css', 'sass', 'less', 'bem',
        'terraform', 'ansible', 'chef', 'puppet', 'circleci', 'gitlab ci',
        'travis ci', 'aws codepipeline', 'azure devops', 'google cloud build',
        'serverless', 'aws lambda', 'google cloud functions', 'azure functions',
        'firebase functions', 'netlify functions', 'websockets', 'webrtc', 'oauth',
        'jwt', 'openid connect', 'saml', 'ldap', 'oidc', 'api gateway', 'kong',
        'apollo server', 'hasura', 'prisma', 'redis', 'elasticsearch', 'dynamodb',
        'firestore', 'bigquery', 'snowflake', 'redshift', 'tableau', 'power bi',
        'looker', 'metabase', 'apache kafka', 'rabbitmq', 'nats', 'protobuf'
    ]
    
    # Common soft skills to look for
    soft_skill_keywords = [
        'communication', 'teamwork', 'leadership', 'problem-solving', 'critical thinking',
        'adaptability', 'time management', 'creativity', 'emotional intelligence',
        'conflict resolution', 'collaboration', 'active listening', 'empathy', 'patience',
        'flexibility', 'work ethic', 'responsibility', 'dependability', 'self-motivation',
        'professionalism', 'initiative', 'decision making', 'stress management',
        'organization', 'attention to detail', 'multitasking', 'networking', 'negotiation',
        'presentation', 'public speaking', 'writing', 'research', 'analysis', 'planning',
        'delegation', 'mentoring', 'coaching', 'training', 'supervision', 'project management',
        'strategic thinking', 'innovation', 'resourcefulness', 'persuasion', 'influence',
        'diplomacy', 'tact', 'cultural awareness', 'customer service', 'sales', 'marketing',
        'business development', 'financial management', 'risk management', 'quality assurance',
        'compliance', 'regulatory', 'legal', 'ethics', 'diversity', 'inclusion', 'equity',
        'belonging', 'accessibility', 'sustainability', 'corporate social responsibility'
    ]
    
    # Try to extract from structured data first
    if isinstance(job_info, dict):
        # Get all text content from the job info
        all_text = []
        if 'job_description' in job_info and isinstance(job_info['job_description'], str):
            all_text.append(job_info['job_description'].lower())
        if 'description' in job_info and isinstance(job_info['description'], str):
            all_text.append(job_info['description'].lower())
        
        # Search for technical skills in the text
        for text in all_text:
            for keyword in tech_keywords:
                if keyword in text:
                    tech_skills.add(keyword.upper() if len(keyword) <= 3 else keyword.title())
            
            # Search for soft skills in the text
            for skill in soft_skill_keywords:
                if skill in text:
                    soft_skills.add(skill.title())
    
    # Convert sets to lists and return
    return {
        "skills": list(tech_skills),  # All technical skills go here for now
        "technologies": list(tech_skills),
        "soft_skills": list(soft_skills)
    }

@router.post("/match")
async def job_match(
    cv_id: str = Body(..., embed=True),
    job_description: str = Body(..., embed=True)
) -> Dict[str, Any]:
    """Extract keywords from job description, compare to CV, and return match analysis."""
    if cv_id not in cv_storage:
        raise HTTPException(status_code=404, detail="CV not found. Please upload your CV first.")
    
    cv_data = cv_storage[cv_id]
    cv_skills = set(skill.lower() for skill in cv_data.get("extracted_skills", []))
    
    # Use AI to extract job requirements/skills
    try:
        job_analysis = await ai_client.analyze_text(job_description, "job_analysis")
        
        # The AI response is a string that we need to parse
        logger.info(f"Raw AI response: {job_analysis}")
        
        # Initialize default job info
        job_info = {
            "job_description": job_description,
            "key_technical_requirements": [],
            "required_technologies_and_skills": [],
            "soft_skills_mentioned": []
        }
        
        # Try to extract structured data from the AI response
        if isinstance(job_analysis.get("analysis"), str):
            analysis_text = job_analysis["analysis"]
            logger.info(f"Analysis text: {analysis_text}")
            
            # Try to extract skills from the text using regex
            import re
            
            # Extract technical requirements
            tech_reqs = re.findall(r'[0-9]+\.\s*(.*?)(?=\n\s*[0-9]+\.|$)', 
                                 analysis_text, re.DOTALL)
            if tech_reqs:
                job_info["key_technical_requirements"] = [req.strip() for req in tech_reqs if req.strip()]
            
            # Extract required skills and technologies
            skills_section = re.search(r'Required Technologies and Skills:?\s*([\s\S]*?)(?=\n\s*Soft Skills|$)', 
                                     analysis_text, re.IGNORECASE)
            if skills_section:
                skills_list = []
                # Look for list items or comma-separated values
                skills_items = re.findall(r'[•-]\s*(.*?)(?=\n|$)', skills_section.group(1))
                if skills_items:
                    skills_list.extend(skills_items)
                else:
                    # Fallback: split by commas and newlines
                    skills_list = [s.strip() for s in re.split(r'[,\n]', skills_section.group(1)) if s.strip()]
                job_info["required_technologies_and_skills"] = skills_list
            
            # Extract soft skills
            soft_skills_section = re.search(r'Soft Skills:?\s*([\s\S]*?)(?=\n\s*Experience Level|$)', 
                                          analysis_text, re.IGNORECASE)
            if soft_skills_section:
                soft_skills = []
                # Look for list items or comma-separated values
                soft_skills_items = re.findall(r'[•-]\s*(.*?)(?=\n|$)', soft_skills_section.group(1))
                if soft_skills_items:
                    soft_skills.extend(soft_skills_items)
                else:
                    # Fallback: split by commas and newlines
                    soft_skills = [s.strip() for s in re.split(r'[,\n]', soft_skills_section.group(1)) if s.strip()]
                job_info["soft_skills_mentioned"] = soft_skills
        
        # Format the job info for better display
        formatted_job_info = {
            "job_title": job_info.get("job_title", "Extracted from Job Description"),
            "key_requirements": job_info.get("key_technical_requirements", [])[:10],
            "technologies": job_info.get("required_technologies_and_skills", [])[:15],
            "soft_skills": job_info.get("soft_skills_mentioned", [])[:10]
        }
        
        # Clean up the data
        for key in ["key_requirements", "technologies", "soft_skills"]:
            formatted_job_info[key] = [
                item.strip() 
                for item in formatted_job_info[key] 
                if isinstance(item, str) and item.strip()
            ]
        
        logger.info(f"Formatted job info: {formatted_job_info}")
        
        # Extract skills using our helper function
        extracted_skills = extract_skills_from_text(job_info)
        logger.info(f"Extracted skills: {extracted_skills}")
        
        # If no skills were extracted, try to extract some from the raw job description
        if not any(extracted_skills.values()):
            logger.warning("No skills extracted from structured data, falling back to raw text extraction")
            extracted_skills = {
                "skills": [],
                "technologies": re.findall(r'\b(?:HTML|CSS|JavaScript|TypeScript|React|Node\.?js|Bootstrap|AWS|NestJS|Python|Java|C#|C\+\+|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Git|Docker|Kubernetes|REST|API|GraphQL|gRPC|Microservices|MVC|MVVM|OOP|Design Patterns|Agile|Scrum|CI/CD|TDD|Jest|Mocha|JUnit|Selenium|Jenkins|GitHub Actions|AWS|Azure|Google Cloud|Firebase|Heroku|Netlify|Vercel|Django|Flask|Express|NestJS|Spring Boot|ASP\.NET|Ruby on Rails|Laravel|Symfony|Angular|Vue\.?js|Svelte|jQuery|Redux|MobX|GraphQL|Apollo|Webpack|Babel|ESLint|Prettier|TypeScript|Flow|Jest|Mocha|Jasmine|Cypress|Storybook|Styled Components|Tailwind CSS|Sass|Less|BEM|ITCSS|OOCSS|SMACSS|Atomic Design|Design Systems|Figma|Sketch|Adobe XD|InVision|Zeplin|Storybook|Chromatic|Lerna|Yarn Workspaces|NPM|Yarn|PNPM|Docker|Kubernetes|Terraform|Ansible|Chef|Puppet|Jenkins|CircleCI|GitHub Actions|GitLab CI|Travis CI|AWS CodePipeline|Azure DevOps|Google Cloud Build|Serverless|AWS Lambda|Google Cloud Functions|Azure Functions|Firebase Functions|Vercel|Netlify Functions|GraphQL|gRPC|REST|SOAP|WebSockets|WebRTC|OAuth|JWT|OpenID Connect|SAML|LDAP|OAuth 2\.0|OIDC|JWT|API Gateway|Kong|Apollo Server|Hasura|Prisma|PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Firestore|BigQuery|Snowflake|Redshift|Tableau|Power BI|Looker|Metabase|Apache Kafka|RabbitMQ|Redis|NATS|gRPC|Protobuf|GraphQL|REST|SOAP|gRPC|WebSockets|WebRTC|OAuth|JWT|OpenID Connect|SAML|LDAP|OAuth 2\.0|OIDC|JWT|API Gateway|Kong|Apollo Server|Hasura|Prisma|PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Firestore|BigQuery|Snowflake|Redshift|Tableau|Power BI|Looker|Metabase|Apache Kafka|RabbitMQ|Redis|NATS|gRPC|Protobuf|GraphQL|REST|SOAP|gRPC|WebSockets|WebRTC|OAuth|JWT|OpenID Connect|SAML|LDAP|OAuth 2\.0|OIDC|JWT|API Gateway|Kong|Apollo Server|Hasura|Prisma|PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Firestore|BigQuery|Snowflake|Redshift|Tableau|Power BI|Looker|Metabase|Apache Kafka|RabbitMQ|Redis|NATS|gRPC|Protobuf)\b', job_description, re.IGNORECASE),
                "soft_skills": re.findall(r'\b(?:Communication|Teamwork|Leadership|Problem-solving|Critical thinking|Adaptability|Time management|Creativity|Emotional intelligence|Conflict resolution|Collaboration|Active listening|Empathy|Patience|Flexibility|Work ethic|Responsibility|Dependability|Self-motivation|Professionalism|Initiative|Decision making|Stress management|Organization|Attention to detail|Multitasking|Networking|Negotiation|Presentation|Public speaking|Writing|Research|Analysis|Planning|Delegation|Mentoring|Coaching|Training|Supervision|Project management|Strategic thinking|Innovation|Resourcefulness|Persuasion|Influence|Diplomacy|Tact|Cultural awareness|Customer service|Sales|Marketing|Business development|Financial management|Risk management|Quality assurance|Compliance|Regulatory|Legal|Ethics|Diversity|Inclusion|Equity|Belonging|Accessibility|Sustainability|Corporate social responsibility|Governance|Risk|Compliance|Audit|Security|Privacy|Data protection|Cybersecurity|Information security|Cloud security|Network security|Application security|DevSecOps|Threat modeling|Vulnerability assessment|Penetration testing|Incident response|Disaster recovery|Business continuity|Crisis management|Risk assessment|Security operations|Security architecture|Identity and access management|Privileged access management|Data loss prevention|Endpoint security|Email security|Web security|Mobile security|IoT security|Cloud security|Container security|Kubernetes security|Serverless security|API security|Zero trust|Zero knowledge|Homomorphic encryption|Differential privacy|Federated learning|Secure multi-party computation|Confidential computing|Quantum computing|Post-quantum cryptography|Blockchain|Smart contracts|Distributed ledger|Web3|DeFi|NFTs|Metaverse|Digital twins|AR|VR|XR|MR|AI|ML|DL|NLP|CV|RL|Generative AI|LLMs|GPT|BERT|Transformers|Diffusion models|Stable Diffusion|DALL·E|Midjourney|ChatGPT|Copilot|GitHub Copilot|Amazon CodeWhisperer|Tabnine|Kite|DeepCode|Snyk|SonarQube|Snyk Code|GitHub CodeQL|GitLab SAST|GitHub Advanced Security|Snyk Open Source|WhiteSource|Black Duck|Dependabot|Renovate|Snyk Container|Anchore|Clair|Trivy|Grype|Syft|Cosign|Notary|TUF|in-toto|SPDX|CycloneDX|SBOM|VEX|CSAF|OSV|CVE|CWE|CVSS|EPSS|SSVC|ATT&CK|MITRE ATT&CK|D3FEND|NIST SSDF|NIST CSF|NIST RMF|NIST PRIVACY|NIST AI RMF|NIST ML|NIST NLP|NIST CV|NIST RL|NIST GAN|NIST TTS|NIST ASR|NIST MT|NIST QA|NIST SUMM|NIST DIAL|NIST TREC|NIST MRE|NIST TAC|NIST TAC KBP|NIST TAC KBP EDL|NIST TAC KBP SF|NIST TAC KBP SF EDL|NIST TAC KBP SF EDL 2019|NIST TAC KBP SF EDL 2020|NIST TAC KBP SF EDL 2021|NIST TAC KBP SF EDL 2022|NIST TAC KBP SF EDL 2023|NIST TAC KBP SF EDL 2024|NIST TAC KBP SF EDL 2025|NIST TAC KBP SF EDL 2026|NIST TAC KBP SF EDL 2027|NIST TAC KBP SF EDL 2028|NIST TAC KBP SF EDL 2029|NIST TAC KBP SF EDL 2030|NIST TAC KBP SF EDL 2031|NIST TAC KBP SF EDL 2032|NIST TAC KBP SF EDL 2033|NIST TAC KBP SF EDL 2034|NIST TAC KBP SF EDL 2035|NIST TAC KBP SF EDL 2036|NIST TAC KBP SF EDL 2037|NIST TAC KBP SF EDL 2038|NIST TAC KBP SF EDL 2039|NIST TAC KBP SF EDL 2040|NIST TAC KBP SF EDL 2041|NIST TAC KBP SF EDL 2042|NIST TAC KBP SF EDL 2043|NIST TAC KBP SF EDL 2044|NIST TAC KBP SF EDL 2045|NIST TAC KBP SF EDL 2046|NIST TAC KBP SF EDL 2047|NIST TAC KBP SF EDL 2048|NIST TAC KBP SF EDL 2049|NIST TAC KBP SF EDL 2050)\b', job_description, re.IGNORECASE)
            }
        
        # Normalize skills to lowercase for case-insensitive comparison
        job_skills = set()
        job_soft_skills = set()
        
        # Extract and normalize skills from the extracted_skills dictionary
        for skill_list in [extracted_skills.get("skills", []), extracted_skills.get("technologies", [])]:
            if isinstance(skill_list, list):
                job_skills.update(skill.lower() for skill in skill_list if isinstance(skill, str))
        
        # Extract and normalize soft skills
        if isinstance(extracted_skills.get("soft_skills"), list):
            job_soft_skills.update(skill.lower() for skill in extracted_skills["soft_skills"] if isinstance(skill, str))
        
        # Match analysis
        matched_skills = list(cv_skills & job_skills) if job_skills else []
        missing_skills = list(job_skills - cv_skills) if job_skills else []
        
        matched_soft_skills = list(cv_skills & job_soft_skills) if job_soft_skills else []
        missing_soft_skills = list(job_soft_skills - cv_skills) if job_soft_skills else []
        
        # Calculate match percentages
        match_percent = int(100 * len(matched_skills) / max(1, len(job_skills))) if job_skills else 0
        soft_skill_percent = int(100 * len(matched_soft_skills) / max(1, len(job_soft_skills))) if job_soft_skills else 0
        
        # Categorize job skills into technologies and soft skills
        technical_keywords = {
            'html', 'css', 'javascript', 'typescript', 'react', 'node', 'bootstrap', 
            'aws', 'python', 'java', 'c#', 'c++', 'sql', 'nosql', 'mongodb', 'postgresql',
            'mysql', 'git', 'docker', 'kubernetes', 'rest', 'api', 'graphql', 'grpc',
            'microservices', 'mvc', 'mvvm', 'oop', 'design patterns', 'agile', 'scrum',
            'ci/cd', 'tdd', 'jest', 'mocha', 'junit', 'selenium', 'jenkins', 'github actions',
            'azure', 'google cloud', 'firebase', 'heroku', 'netlify', 'vercel', 'django',
            'flask', 'express', 'spring boot', 'asp.net', 'ruby on rails', 'laravel',
            'symfony', 'angular', 'vue', 'svelte', 'jquery', 'redux', 'mobx', 'apollo',
            'webpack', 'babel', 'eslint', 'prettier', 'flow', 'jasmine', 'cypress',
            'storybook', 'styled components', 'tailwind css', 'sass', 'less', 'bem',
            'terraform', 'ansible', 'chef', 'puppet', 'circleci', 'gitlab ci',
            'travis ci', 'aws codepipeline', 'azure devops', 'google cloud build',
            'serverless', 'aws lambda', 'google cloud functions', 'azure functions',
            'firebase functions', 'netlify functions', 'websockets', 'webrtc', 'oauth',
            'jwt', 'openid connect', 'saml', 'ldap', 'oidc', 'api gateway', 'kong',
            'apollo server', 'hasura', 'prisma', 'redis', 'elasticsearch', 'dynamodb',
            'firestore', 'bigquery', 'snowflake', 'redshift', 'tableau', 'power bi',
            'looker', 'metabase', 'apache kafka', 'rabbitmq', 'nats', 'protobuf'
        }
        
        # Categorize skills
        job_technologies = []
        job_skills_list = []
        
        if isinstance(job_skills, (set, list)):
            for skill in job_skills:
                if isinstance(skill, str):
                    skill_lower = skill.lower()
                    if any(tech in skill_lower for tech in technical_keywords):
                        job_technologies.append(skill)
                    else:
                        job_skills_list.append(skill)
        
        # Generate structured suggestions
        suggestions = []
        
        # 1. Skills to add
        if missing_skills:
            suggestions.append({
                "id": "skills_to_add",
                "title": "Add Missing Skills",
                "icon": "code",
                "category": "skills",
                "priority": "high",
                "items": [{"text": skill, "action": "add"} for skill in missing_skills[:5]],
                "description": "These skills are mentioned in the job description but not in your CV"
            })
        
        # 2. Skills to highlight
        if matched_skills:
            suggestions.append({
                "id": "skills_to_highlight",
                "title": "Highlight These Skills",
                "icon": "star",
                "category": "skills",
                "priority": "medium",
                "items": [{"text": skill, "action": "highlight"} for skill in matched_skills[:5]],
                "description": "These skills match the job requirements - make sure they're prominent"
            })
        
        # 3. Missing soft skills
        if missing_soft_skills:
            suggestions.append({
                "id": "missing_soft_skills",
                "title": "Add Soft Skills",
                "icon": "group",
                "category": "soft_skills",
                "priority": "medium",
                "items": [{"text": skill, "action": "add"} for skill in missing_soft_skills[:5]],
                "description": "These soft skills are important for this role"
            })
        
        # 4. Formatting suggestions
        suggestions.append({
            "id": "formatting_tips",
            "title": "Formatting Tips",
            "icon": "format_align_left",
            "category": "formatting",
            "priority": "low",
            "items": [
                {"text": "Use bullet points for achievements", "action": "suggest"},
                {"text": "Keep work experience concise", "action": "suggest"},
                {"text": "Include metrics where possible", "action": "suggest"}
            ],
            "description": "Improve readability with these formatting tips"
        })

        # Format response to match frontend expectations
        response = {
            "success": True,
            "match_percent": match_percent,
            "soft_skill_percent": soft_skill_percent if 'soft_skill_percent' in locals() else 0,
            "suggestions": suggestions,
            "job_info": {
                "skills": job_skills_list,
                "technologies": job_technologies,
                "soft_skills": list(job_soft_skills) if isinstance(job_soft_skills, set) else (job_soft_skills if job_soft_skills else [])
            },
            # Keep legacy fields for backward compatibility
            "matched_skills": list(matched_skills) if isinstance(matched_skills, set) else matched_skills,
            "missing_skills": list(missing_skills) if isinstance(missing_skills, set) else missing_skills,
            "matched_soft_skills": list(matched_soft_skills) if isinstance(matched_soft_skills, set) else matched_soft_skills,
            "missing_soft_skills": list(missing_soft_skills) if isinstance(missing_soft_skills, set) else missing_soft_skills,
            # Include additional data for debugging
            "_debug": {
                "cv_skills": list(cv_skills) if isinstance(cv_skills, set) else cv_skills,
                "job_skills": list(job_skills) if isinstance(job_skills, set) else job_skills,
                "job_technologies": job_technologies,
                "job_soft_skills": list(job_soft_skills) if isinstance(job_soft_skills, set) else job_soft_skills,
                "formatted_job_info": formatted_job_info
            }
        }
        
        logger.info(f"Sending response: {json.dumps({k: v for k, v in response.items() if k != '_debug'}, default=str)}")
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing job description: {str(e)}")