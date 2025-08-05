import os
import cohere
import openai
from typing import Optional, Dict, Any, List, Union
import httpx
import asyncio
import logging

# OpenAI v0.28.1 doesn't have OpenAI class, using direct module functions

logger = logging.getLogger(__name__)

class AIClient:
    def __init__(self):
        self._cohere_client = None
        self._openai_client = None
        self._initialized = False
    
    @property
    def cohere_client(self):
        if self._cohere_client is None and not self._initialized:
            self._initialize_cohere()
        return self._cohere_client
    
    @property
    def openai_client(self):
        # For OpenAI v0.28.1, we don't maintain a client instance
        if not hasattr(self, '_openai_initialized'):
            self._openai_initialized = self._initialize_openai()
        return self._openai_initialized
    
    def _initialize_cohere(self):
        cohere_api_key = os.getenv("COHERE_API_KEY")
        if cohere_api_key:
            try:
                self._cohere_client = cohere.Client(api_key=cohere_api_key)
                logger.info("Cohere client initialized successfully")
                # Test the Cohere connection
                self._cohere_client.chat(
                    model="command",
                    message="Test connection"
                )
                logger.info("Cohere connection test successful")
                return True
            except Exception as e:
                logger.error(f"Failed to initialize Cohere client: {str(e)}")
                self._cohere_client = None
        else:
            logger.warning("COHERE_API_KEY not found in environment variables")
        return False
    
    def _initialize_openai(self):
        # For OpenAI v0.28.1, we don't need to create a client instance
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logger.warning("OPENAI_API_KEY not found in environment variables")
            return False
            
        try:
            openai.api_key = openai_api_key
            # Test the connection with a simple completion using gpt-3.5-turbo-instruct
            openai.Completion.create(
                engine="gpt-3.5-turbo-instruct",
                prompt="Test",
                max_tokens=1
            )
            logger.info("OpenAI client initialized successfully")
            return True
            
        except openai.error.RateLimitError as e:
            logger.warning(f"OpenAI rate limit exceeded: {str(e)}. Falling back to Cohere.")
            return False
            
        except openai.error.AuthenticationError as e:
            logger.warning(f"OpenAI authentication failed: {str(e)}. Falling back to Cohere.")
            return False
            
        except openai.error.APIError as e:
            logger.warning(f"OpenAI API error: {str(e)}. Falling back to Cohere.")
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error initializing OpenAI client: {str(e)}")
            return False
    
    def _initialize_clients(self):
        if not self._initialized:
            # Always try to initialize Cohere first as it's our primary provider
            cohere_initialized = self._initialize_cohere()
            
            # Only try OpenAI if Cohere failed
            openai_initialized = False
            if not cohere_initialized:
                openai_initialized = self._initialize_openai()
                
            self._initialized = cohere_initialized or openai_initialized
            
            if not self._initialized:
                logger.error("Failed to initialize any AI client. The application may have limited functionality.")
            elif not cohere_initialized and openai_initialized:
                logger.warning("Only OpenAI client is available. Some features may be limited.")
            elif cohere_initialized and not openai_initialized:
                logger.info("Cohere client initialized successfully. OpenAI is not available.")
            else:
                logger.info("Both Cohere and OpenAI clients initialized successfully.")

    async def generate_text(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.7) -> str:
        """Generate text using available AI providers with fallback logic."""
        
        # Try Cohere first (free tier available)
        if self.cohere_client:
            try:
                response = self.cohere_client.generate(
                    model="command",
                    prompt=prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    k=0,
                    stop_sequences=[],
                    return_likelihoods='NONE'
                )
                return response.generations[0].text.strip()
            except Exception as e:
                print(f"Cohere error: {e}")
        
        # Fallback to OpenAI
        if self.openai_client:
            try:
                # For OpenAI v0.28.1, use the older API format with gpt-3.5-turbo-instruct
                response = openai.Completion.create(
                    engine="gpt-3.5-turbo-instruct",  # Compatible with older API versions
                    prompt=prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=1.0,
                    frequency_penalty=0.0,
                    presence_penalty=0.0
                )
                return response.choices[0].text.strip()
            except Exception as e:
                print(f"OpenAI error: {e}")
        
        # If no AI providers available, return a placeholder
        return "AI service temporarily unavailable. Please check your API keys."
    
    async def analyze_text(self, text: str, analysis_type: str) -> Dict[str, Any]:
        """Analyze text for specific purposes like CV analysis, code review, etc."""
        
        prompts = {
            "cv_analysis": f"""
            Analyze this CV/resume and provide feedback on:
            1. Structure and organization
            2. Clarity and readability
            3. Missing sections
            4. Overall impression
            
            CV Content:
            {text}
            
            Provide a structured analysis with specific recommendations.
            """,
            
            "code_review": f"""
            Review this code and provide feedback on:
            1. Code quality and best practices
            2. Potential bugs or issues
            3. Performance optimizations
            4. Readability improvements
            5. Security considerations
            
            Code:
            {text}
            
            Provide a comprehensive code review with specific suggestions.
            """,
            
            "job_analysis": f"""
            Analyze this job description and extract:
            1. Key technical requirements
            2. Required technologies and skills
            3. Soft skills mentioned
            4. Experience level required
            5. Company culture indicators
            
            Job Description:
            {text}
            
            Provide a structured analysis in JSON format.
            """
        }
        
        prompt = prompts.get(analysis_type, f"Analyze this text: {text}")
        analysis = await self.generate_text(prompt, max_tokens=1500, temperature=0.3)
        
        return {
            "analysis": analysis,
            "type": analysis_type,
            "provider": "cohere" if self.cohere_client else "openai" if self.openai_client else "none"
        }
    
    async def extract_company_name(self, job_description: str) -> str:
        """Extract the company name from a job description."""
        prompt = f"""
        Extract just the company name from this job description. 
        Return ONLY the company name, nothing else.
        
        Job Description:
        {job_description}
        
        Company Name:
        """
        
        company_name = await self.generate_text(prompt, max_tokens=50, temperature=0.1)
        # Clean up the response to ensure it's just the company name
        company_name = company_name.strip().split('\n')[0].strip('"\'').strip()
        return company_name if company_name else "Company"

    async def generate_cover_letter(self, cv_content: str, job_description: str, language: str = "English") -> Dict[str, str]:
        """Generate a personalized cover letter based on CV and job description.
        
        Returns:
            Dict containing 'content' (the cover letter) and 'company_name'
        """
        # First extract the company name
        company_name = await self.extract_company_name(job_description)
        
        prompt = f"""
        Generate a professional cover letter in {language} based on the following CV and job description.
        
        CV Content:
        {cv_content}
        
        Job Description:
        {job_description}
        
        Requirements:
        1. Personalize the letter to match the job requirements
        2. Highlight relevant experience from the CV
        3. Show enthusiasm for the role and company
        4. Keep it concise (300-400 words)
        5. Use professional tone
        6. Include a clear call to action
        
        Generate the cover letter:
        """
        
        cover_letter = await self.generate_text(prompt, max_tokens=800, temperature=0.7)
        
        return {
            "content": cover_letter,
            "company_name": company_name
        }
    
    async def detect_role_and_domain(self, job_description: str) -> dict:
        """
        Detect the role and domain from a job description.
        Returns a dictionary with 'role' and 'domain' keys.
        """
        prompt = f"""
        Analyze the following job description and determine:
        1. The specific job role (e.g., 'Marketing Manager', 'Sales Representative')
        2. The general domain/industry (e.g., 'Marketing', 'Sales', 'Healthcare')
        
        Job Description:
        {job_description}
        
        Return a JSON object with these fields:
        - "role": The specific job role
        - "domain": The general domain/industry
        
        Only return the JSON object, nothing else.
        """
        
        try:
            response = await self.generate_text(prompt, max_tokens=200, temperature=0.3)
            # Clean and parse the response
            response = response.strip().strip('```json').strip('```').strip()
            import json
            result = json.loads(response)
            
            # Validate the response
            if not all(key in result for key in ["role", "domain"]):
                raise ValueError("Invalid response format from AI")
                
            return result
            
        except Exception as e:
            logger.error(f"Error detecting role and domain: {str(e)}")
            # Return default values in case of error
            return {
                "role": "Professional Role",
                "domain": "General Business"
            }

    async def generate_interview_questions(self, job_description: str, question_type: str, count: int = 8) -> Dict[str, Any]:
        """Generate interview questions based on job description and type."""
        
        if question_type == "non_technical":
            # First detect the role and domain
            role_info = await self.detect_role_and_domain(job_description)
            role = role_info["role"]
            domain = role_info["domain"]
            
            prompt = f"""
            Generate exactly {count} interview questions for a {role} role in the {domain} domain.
            Focus on questions that assess:
            - Role-specific knowledge and skills
            - Industry best practices
            - Problem-solving in this domain
            - Communication and interpersonal skills
            - Past experiences relevant to this role
            
            Job Description:
            {job_description}
            
            Important: Start directly with the questions, no introductory text.
            Format each question on a new line with a number and period (e.g., "1. Question text").
            Do not include any other text before, between, or after the questions.
            """
        elif question_type == "hr":
            prompt = f"""
            Generate exactly {count} HR interview questions based on this job description. 
            Focus on:
            - Soft skills
            - Teamwork and collaboration
            - Problem-solving approach
            - Career goals
            - Cultural fit
            
            Job Description:
            {job_description}
            
            Important: Start directly with the questions, no introductory text.
            Format each question on a new line with a number and period (e.g., "1. Question text").
            Do not include any other text before, between, or after the questions.
            """
        else:  # technical
            prompt = f"""
            Generate exactly {count} technical interview questions based on this job description.
            Include:
            - Theory questions
            - Practical coding scenarios
            - System design concepts
            - Technology-specific questions
            
            Job Description:
            {job_description}
            
            Important: Start directly with the questions, no introductory text.
            Format each question on a new line with a number and period (e.g., "1. Question text").
            Do not include any other text before, between, or after the questions.
            """
        
        questions = await self.generate_text(prompt, max_tokens=1000, temperature=0.6)
        
        # For non-technical questions, include the detected role and domain in the response
        result = {
            "questions": questions,
            "type": question_type,
            "job_description": job_description
        }
        
        if question_type == "non_technical":
            result.update({
                "detected_role": role,
                "detected_domain": domain
            })
        
        return result

    async def evaluate_answer(self, question: str, answer: str, question_type: str) -> Dict[str, Any]:
        """Evaluate an interview answer and provide feedback."""
        
        prompt = f"""
        Evaluate this interview answer and provide feedback:
        
        Question: {question}
        Answer: {answer}
        Question Type: {question_type}
        
        Provide feedback on:
        1. Completeness of the answer
        2. Clarity and communication
        3. Technical accuracy (if applicable)
        4. Areas for improvement
        
        At the end, provide a score from 1-10 based on the answer's quality.
        Format the score as: SCORE: X/10 where X is the score.
        
        Give constructive feedback with specific suggestions.
        """
        
        evaluation = await self.generate_text(prompt, max_tokens=600, temperature=0.5)
        
        # Extract score from evaluation text (look for SCORE: X/10 pattern)
        import re
        score_match = re.search(r'SCORE:\s*(\d+(?:\.\d+)?)/10', evaluation, re.IGNORECASE)
        score = 5  # Default score if not found
        if score_match:
            try:
                score = float(score_match.group(1))
            except (ValueError, IndexError):
                pass
        
        return {
            "evaluation": evaluation,
            "question": question,
            "answer": answer,
            "type": question_type,
            "score": score
        }

# Global AI client instance
ai_client = AIClient() 