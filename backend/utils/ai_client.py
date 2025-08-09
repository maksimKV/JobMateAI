import os
import re
import cohere
from openai import OpenAI, APIError, RateLimitError, AuthenticationError
from typing import Optional, Dict, Any, List, Union, Callable
import httpx
import asyncio
import logging
from pathlib import Path
import json
import uuid
import time

# Import translation service
from .translations import translator

# Import for type hints
from fastapi import Request

logger = logging.getLogger(__name__)

class AIClient:
    def __init__(self):
        self._cohere_client = None
        self._openai_client = None
        self._initialized = False
        self._prompt_templates = {}
        self._load_prompt_templates()
        
    def _load_prompt_templates(self):
        """Load prompt templates from configuration"""
        try:
            # Try to load custom prompts if they exist
            prompts_path = Path(__file__).parent.parent / 'config' / 'prompts.json'
            if prompts_path.exists():
                with open(prompts_path, 'r', encoding='utf-8') as f:
                    self._prompt_templates = json.load(f)
                logger.info(f"Loaded custom prompts from {prompts_path}")
            else:
                # Use default prompts from translations
                logger.info("No custom prompts found, using default prompts from translations")
                self._prompt_templates = {
                    'en': {
                        'skill_extraction': """Analyze the following job description and extract all mentioned skills, technologies, and soft skills. 
                        Categorize them into:
                        - technical_skills: Programming languages, frameworks, tools, etc.
                        - technologies: Specific technologies, platforms, or systems
                        - soft_skills: Interpersonal skills, communication, teamwork, etc.
                        
                        Format the response as a JSON object with these three arrays. Only include the JSON object in your response.
                        
                        Job description: {text}""",
                        'suggestion_generation': """Compare the following job requirements with the candidate's CV skills and provide exactly 6 high-quality improvement suggestions.
                        
                        Job Requirements:
                        {job_skills}
                        
                        Candidate's CV Skills:
                        {cv_skills}
                        
                        Generate exactly 6 suggestions in this JSON format. Ensure each suggestion is unique and provides specific, actionable advice.
                        [
                            {
                                "id": "unique_id_1",
                                "title": "Suggestion Title",
                                "icon": "code|star|group|format_align_left|school|lightbulb",
                                "category": "Skill Enhancement|Experience|Education|Certification|Portfolio|Networking",
                                "priority": "high|medium|low",
                                "description": "Detailed suggestion with specific actions the candidate can take",
                                "items": [
                                    {"text": "Specific action item", "action": "add|highlight|suggest"}
                                ]
                            },
                            {
                                "id": "unique_id_2",
                                "title": "Another Suggestion",
                                "icon": "school|group|code|star|format_align_left|lightbulb",
                                "category": "Education|Networking|Skill Enhancement|Experience|Portfolio|Certification",
                                "priority": "high|medium|low",
                                "description": "Another detailed suggestion with specific actions",
                                "items": [
                                    {"text": "First action step", "action": "add|highlight|suggest"},
                                    {"text": "Second action step", "action": "add|highlight|suggest"}
                                ]
                            }
                            // Add 4 more suggestions following the same format
                        ]"""
                    }
                }
        except Exception as e:
            logger.error(f"Error loading prompt templates: {e}")
    
    def get_prompt(self, prompt_key: str, language: str = 'en', **kwargs) -> str:
        """
        Get a localized prompt by key.
        
        Args:
            prompt_key: The key of the prompt to retrieve (e.g., 'cv_analysis')
            language: Language code (default: 'en')
            **kwargs: Format arguments for the prompt
            
        Returns:
            The localized and formatted prompt string
        """
        # First try to get from custom prompts
        if prompt_key in self._prompt_templates.get(language, {}):
            template = self._prompt_templates[language][prompt_key]
        else:
            # Fall back to translations
            template = translator.get(f"ai.{prompt_key}_prompt", language)
            
        # Format the template with provided kwargs
        try:
            return template.format(**kwargs)
        except KeyError as e:
            logger.warning(f"Missing template variable {e} in prompt '{prompt_key}'")
            return template
            
    async def generate_structured_output(
        self,
        prompt: str,
        output_type: type,
        model: str = "command-r-plus",
        temperature: float = 0.3,
        **kwargs
    ) -> Any:
        """
        Generate structured output using the specified model.
        
        Args:
            prompt: The prompt to generate text from
            output_type: The expected output type (e.g., dict, list)
            model: The model to use for generation
            temperature: Controls randomness (0.0 to 1.0)
            **kwargs: Additional model parameters
            
        Returns:
            Structured output of the specified type
        """
        try:
            # Add JSON response format instruction
            if output_type in (dict, list):
                prompt += "\n\nRespond with a valid JSON object only, no other text or formatting."
            
            # Try Cohere first
            if self.cohere_client and model.startswith("command"):
                response = self.cohere_client.generate(
                    model=model,
                    prompt=prompt,
                    max_tokens=4000,
                    temperature=temperature,
                    **kwargs
                )
                result = response.generations[0].text.strip()
            
            # Fall back to OpenAI if available
            elif self.openai_client:
                response = await self.openai_client.chat.completions.create(
                    model=model if model != "command-r-plus" else "gpt-4-turbo-preview",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=4000,
                    temperature=temperature,
                    response_format={"type": "json_object"} if output_type == dict else None,
                    **kwargs
                )
                result = response.choices[0].message.content.strip()
            else:
                raise RuntimeError("No available AI client")
            
            # Parse JSON response
            try:
                # Extract JSON from markdown code blocks if present
                json_match = re.search(r'```(?:json)?\n(.*?)\n```', result, re.DOTALL)
                if json_match:
                    result = json_match.group(1)
                
                parsed = json.loads(result)
                if not isinstance(parsed, output_type):
                    if output_type == dict and isinstance(parsed, list):
                        parsed = {"items": parsed}
                    elif output_type == list and isinstance(parsed, dict) and "items" in parsed:
                        parsed = parsed["items"]
                    else:
                        raise ValueError(f"Unexpected output format, expected {output_type}")
                return parsed
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {result}")
                raise ValueError(f"Failed to parse AI response: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in generate_structured_output: {str(e)}")
            raise

    async def extract_skills(self, text: str, language: str = 'en') -> Dict[str, List[str]]:
        """
        Extract skills from text using AI.
        
        Args:
            text: The text to extract skills from
            language: Language code for the response
            
        Returns:
            Dictionary with 'skills', 'technologies', and 'soft_skills' lists
        """
        try:
            prompt = self.get_prompt('skill_extraction', language, text=text)
            result = await self.generate_structured_output(
                prompt=prompt,
                output_type=dict,
                temperature=0.2  # Use lower temperature for more consistent results
            )
            
            # Ensure all required keys exist
            return {
                'skills': result.get('technical_skills', []) + result.get('skills', []),
                'technologies': result.get('technologies', []),
                'soft_skills': result.get('soft_skills', [])
            }
            
        except Exception as e:
            logger.warning(f"AI skill extraction failed: {str(e)}")
            raise

    async def generate_suggestions(
        self,
        job_skills: Dict[str, List[str]],
        cv_skills: Dict[str, List[str]],
        language: str = 'en'
    ) -> List[Dict[str, Any]]:
        """
        Generate improvement suggestions based on job requirements and CV skills.
        
        Args:
            job_skills: Dictionary of skills from job description
            cv_skills: Dictionary of skills from CV
            language: Language code for the response
            
        Returns:
            List of suggestion dictionaries
        """
        try:
            prompt = self.get_prompt(
                'suggestion_generation',
                language,
                job_skills=json.dumps(job_skills, indent=2),
                cv_skills=json.dumps(cv_skills, indent=2)
            )
            
            suggestions = await self.generate_structured_output(
                prompt=prompt,
                output_type=list,
                temperature=0.4
            )
            
            # Ensure all suggestions have required fields
            for suggestion in suggestions:
                suggestion.setdefault('id', str(uuid.uuid4()))
                suggestion.setdefault('priority', 'medium')
                suggestion.setdefault('items', [])
                
            return suggestions
            
        except Exception as e:
            logger.warning(f"AI suggestion generation failed: {str(e)}")
            return []
            return template
    
    @property
    def cohere_client(self):
        if self._cohere_client is None and not self._initialized:
            self._initialize_cohere()
        return self._cohere_client
    
    @property
    def openai_client(self):
        if not hasattr(self, '_openai_client'):
            self._openai_client = self._initialize_openai()
        return self._openai_client if self._openai_client else None
    
    def _initialize_cohere(self) -> bool:
        """Initialize the Cohere client with the latest supported model.
        
        Returns:
            bool: True if initialization was successful, False otherwise
        """
        cohere_api_key = os.getenv("COHERE_API_KEY")
        if not cohere_api_key:
            logger.warning("COHERE_API_KEY not found in environment variables")
            return False
            
        try:
            self._cohere_client = cohere.Client(api_key=cohere_api_key)
            logger.info("Cohere client initialized successfully")
            
            # Test the connection with the latest model
            self._cohere_client.generate(
                model="command-r-plus",  # Using the latest model
                prompt="Test",
                max_tokens=1
            )
            logger.info("Cohere connection test successful")
            return True
            
        except cohere.CohereAPIError as e:
            logger.error(f"Cohere API error during initialization: {str(e)}")
            if hasattr(e, 'status_code'):
                logger.error(f"Status code: {e.status_code}")
            if hasattr(e, 'body'):
                logger.error(f"Response: {e.body}")
                
        except Exception as e:
            logger.error(f"Unexpected error initializing Cohere client: {str(e)}", exc_info=True)
            
        self._cohere_client = None
        return False
    
    def _initialize_openai(self):
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            logger.warning("OPENAI_API_KEY not found in environment variables")
            return None
            
        try:
            client = OpenAI(api_key=openai_api_key)
            
            # Test the connection with a simple completion
            client.completions.create(
                model="gpt-3.5-turbo-instruct",
                prompt="Test",
                max_tokens=1
            )
            logger.info("OpenAI client initialized successfully")
            return client
            
        except RateLimitError as e:
            logger.warning(f"OpenAI rate limit exceeded: {str(e)}. Falling back to Cohere.")
            return None
            
        except AuthenticationError as e:
            logger.warning(f"OpenAI authentication failed: {str(e)}. Falling back to Cohere.")
            return None
            
        except APIError as e:
            logger.warning(f"OpenAI API error: {str(e)}. Falling back to Cohere.")
            return None
            
        except Exception as e:
            logger.error(f"Unexpected error initializing OpenAI client: {str(e)}", exc_info=True)
            return None
    
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

    async def generate_text(
        self,
        prompt: Union[str, tuple],
        model: str = "command-r-plus",
        max_tokens: int = 2000,  # Increased for code reviews
        temperature: float = 0.2,  # Lower temperature for more focused responses
        language: str = 'en',
        **kwargs
    ) -> str:
        """
        Generate text using available AI providers with fallback logic.
        
        Args:
            prompt: The prompt or template key to generate text from
            model: The model to use for generation
            max_tokens: Maximum number of tokens to generate
            temperature: Controls randomness (0.0 to 1.0)
            language: Language code for localization
            **kwargs: Additional arguments for the prompt template
            
        Returns:
            Generated text or error message if all providers fail
        """
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        
        # Log the request
        logger.info(
            "[%s] Starting text generation request. Model: %s, Max tokens: %d, Temperature: %.2f, Language: %s",
            request_id, model, max_tokens, temperature, language
        )
        logger.debug("[%s] Prompt (first 200 chars): %s", request_id, str(prompt)[:200])
        
        # Handle prompt templates
        if isinstance(prompt, tuple):
            prompt_key, format_kwargs = prompt[0], prompt[1]
            prompt = self.get_prompt(prompt_key, language=language, **format_kwargs)
        
        # Try Cohere first (free tier available)
        if self.cohere_client:
            try:
                logger.debug("[%s] Trying Cohere API with model: %s", request_id, model)
                
                # Check if this is a code review prompt by looking for code blocks and review instructions
                is_code_review = ("```" in prompt and 
                               ("review" in prompt.lower() or 
                                "analyze" in prompt.lower() or
                                any(word in prompt.lower() for word in ["strengths", "improvements", "critical issues"])))
                
                if is_code_review:
                    # Extract the code block for better processing
                    code_block = ""
                    code_match = re.search(r'```(?:\w+)?\s*([\s\S]*?)\s*```', prompt, re.DOTALL)
                    if code_match:
                        code_block = code_match.group(1).strip()
                    
                    # Create a more structured prompt with clear instructions
                    system_prompt = """
                    You are an expert code reviewer. Your task is to analyze the provided code and provide a direct, 
                    actionable code review. Follow these rules:
                    
                    1. Start directly with the review - NO INTRODUCTORY TEXT
                    2. Be specific and provide line numbers where applicable
                    3. Follow the exact format specified below
                    4. Be concise but thorough in your analysis
                    
                    Format your response EXACTLY as follows (include all sections):
                    
                    ## Code Summary
                    [1-2 sentence summary of what the code does]
                    
                    ## Detected Language
                    [Programming language]
                    
                    ## Strengths
                    - [Specific strength 1 with line numbers]
                    - [Specific strength 2 with line numbers]
                    
                    ## Critical Issues
                    - [Critical issue 1 with line numbers and impact]
                    - [Critical issue 2 with line numbers and impact]
                    
                    ## Improvements Needed
                    - [Specific improvement 1 with example]
                    - [Specific improvement 2 with example]
                    
                    ## Security Notes
                    - [Security concern 1 or 'No major security issues found']
                    
                    ## Performance Tips
                    - [Performance suggestion 1 or 'No major performance issues found']
                    
                    ## Final Score: X/10
                    [Brief justification for the score]
                    
                    IMPORTANT: Start directly with the review content, no intros or explanations!
                    """.strip()
                    
                    # Create the final prompt
                    final_prompt = f"""
                    {system_prompt}
                    
                    CODE TO REVIEW:
                    ```
                    {code_block}
                    ```
                    
                    Now provide your code review, starting directly with the content (no intros):
                    """.strip()
                    
                    logger.debug("[%s] Using structured code review prompt", request_id)
                    
                    try:
                        # First try using the chat endpoint with system prompt
                        response = self.cohere_client.chat(
                            model=model,
                            message=final_prompt,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            p=0.9,
                            k=0,
                            prompt_truncation="AUTO"
                        )
                        result_text = response.text.strip()
                    except Exception as e:
                        logger.warning("Chat endpoint failed, falling back to generate endpoint: %s", str(e))
                        # Fallback to generate endpoint
                        response = self.cohere_client.generate(
                            model=model,
                            prompt=final_prompt,
                            max_tokens=max_tokens,
                            temperature=temperature,
                            k=0,
                            p=0.9,
                            frequency_penalty=0.3,
                            presence_penalty=0.3,
                            return_likelihoods='NONE',
                            truncate='END'
                        )
                        result_text = response.generations[0].text.strip()
                    
                    # Clean up the response
                    if result_text:
                        # Remove any markdown code block markers
                        if result_text.startswith('```') and result_text.endswith('```'):
                            result_text = result_text[3:-3].strip()
                        
                        # Ensure the response starts with the expected format
                        lines = result_text.split('\n')
                        start_idx = 0
                        for i, line in enumerate(lines):
                            if line.strip().startswith('## '):
                                start_idx = i
                                break
                        
                        result_text = '\n'.join(lines[start_idx:]).strip()
                        
                        # Ensure all required sections are present
                        required_sections = [
                            '## Code Summary',
                            '## Detected Language',
                            '## Strengths',
                            '## Critical Issues',
                            '## Improvements Needed',
                            '## Security Notes',
                            '## Performance Tips',
                            '## Final Score'
                        ]
                        
                        for section in required_sections:
                            if section not in result_text:
                                result_text += f"\n\n{section}\n[Not provided]"
                    
                    return result_text
                else:
                    # For other types of prompts, use the chat endpoint
                    response = self.cohere_client.chat(
                        model=model,
                        message=prompt,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        p=0.9,
                        k=0,
                        prompt_truncation="AUTO"
                    )
                    result_text = response.text
                
                # Clean up the response
                result_text = result_text.strip()
                
                # Log successful response
                duration = time.time() - start_time
                logger.info(
                    "[%s] Cohere API request completed in %.2fs. Response length: %d",
                    request_id, duration, len(result_text)
                )
                logger.debug("[%s] Cohere response (first 200 chars): %s", request_id, result_text[:200])
                
                return result_text
                
            except Exception as e:
                error_msg = f"Cohere API error: {str(e)}"
                logger.error("[%s] %s", request_id, error_msg, exc_info=True)
        
        # Fallback to OpenAI
        if self.openai_client:
            try:
                logger.debug("[%s] Falling back to OpenAI API", request_id)
                
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
                
                # Log successful response
                duration = time.time() - start_time
                logger.info(
                    "[%s] OpenAI API request completed in %.2fs. Response length: %d",
                    request_id, duration, len(response.choices[0].text)
                )
                logger.debug("[%s] OpenAI response (first 200 chars): %s", request_id, response.choices[0].text[:200])
                
                return response.choices[0].text.strip()
                
            except Exception as e:
                error_msg = f"OpenAI API error: {str(e)}"
                logger.error("[%s] %s", request_id, error_msg, exc_info=True)
        
        # If no AI providers available, log error and return a placeholder
        error_msg = "No AI providers available. Please check your API keys and configuration."
        logger.error("[%s] %s", request_id, error_msg)
        
        return "AI service temporarily unavailable. Please check your API keys."
    
    async def extract_job_info(self, job_description: str) -> Dict[str, str]:
        """
        Extract company name and position from a job description with robust error handling.
        
        Args:
            job_description: The job description text to extract information from.
            
        Returns:
            A dictionary with 'company_name' and 'position' keys.
            On error, returns default values ("Company" and "Position").
        """
        # Default values if extraction fails
        result = {
            "company_name": "Company",
            "position": "Position",
            "_extraction_success": False,
            "_extraction_errors": []
        }
        
        # Input validation
        if not job_description or not isinstance(job_description, str):
            error_msg = f"Empty or invalid job description provided: {type(job_description)}"
            logger.warning(error_msg)
            result["_extraction_errors"].append(error_msg)
            return result
            
        # Clean and truncate job description to avoid token limits
        job_description = job_description.strip()
        if len(job_description) > 4000:
            logger.warning(f"Job description too long ({len(job_description)} chars), truncating to 4000 chars")
            job_description = job_description[:4000]
        
        # Create a structured prompt
        prompt = f"""Extract the following information from the job description below:
        1. Company name (field: company_name)
        2. Job position/title (field: position)
        
        Return ONLY a valid JSON object with these fields. If information is not available, 
        use 'Company' for company_name and 'Position' for position.
        
        Job Description:
        {job_description}
        
        Response (JSON only, no other text):
        """
        
        # Try with Cohere first (latest model)
        if self.cohere_client:
            try:
                logger.info("Attempting to extract job info using Cohere command-r-plus")
                
                # Set up system instructions in the preamble
                preamble = "You are a helpful assistant that extracts structured information from job descriptions. " \
                          "Extract the company name and job position from the provided job description."
                
                # Use the latest Cohere model with proper parameters
                response = self.cohere_client.chat(
                    model="command-r-plus",
                    message=prompt,
                    preamble=preamble,
                    temperature=0.1,
                    max_tokens=200,
                    p=0.9,
                    k=0,
                    prompt_truncation="AUTO"
                )
                
                response_text = response.text.strip()
                logger.debug(f"Cohere response (truncated): {response_text[:200]}...")
                
                # Parse the response
                extracted = self._parse_job_info_response(response_text)
                if extracted:
                    logger.info("Successfully extracted job info using Cohere")
                    extracted["_extraction_success"] = True
                    extracted["_extraction_source"] = "cohere"
                    return extracted
                    
            except cohere.CohereAPIError as e:
                error_msg = f"Cohere API error: {str(e)}"
                if hasattr(e, 'status_code'):
                    error_msg += f" (Status: {e.status_code})"
                logger.error(error_msg)
                result["_extraction_errors"].append(error_msg)
                
            except Exception as e:
                error_msg = f"Unexpected error with Cohere: {str(e)}"
                logger.error(error_msg, exc_info=True)
                result["_extraction_errors"].append(error_msg)
        else:
            logger.warning("Cohere client not available for extraction")
            result["_extraction_errors"].append("Cohere client not initialized")
        
        # Fallback to OpenAI if Cohere fails or is not available
        if self.openai_client:
            try:
                logger.info("Falling back to OpenAI for job info extraction")
                response = await self.generate_text(
                    prompt=prompt,
                    max_tokens=200,
                    temperature=0.1
                )
                logger.debug(f"OpenAI response (truncated): {response[:200]}...")
                
                extracted = self._parse_job_info_response(response)
                if extracted:
                    logger.info("Successfully extracted job info using OpenAI")
                    extracted["_extraction_success"] = True
                    extracted["_extraction_source"] = "openai"
                    return extracted
                    
            except Exception as e:
                error_msg = f"OpenAI extraction failed: {str(e)}"
                logger.error(error_msg, exc_info=True)
                result["_extraction_errors"].append(error_msg)
        else:
            logger.warning("OpenAI client not available for extraction")
            result["_extraction_errors"].append("OpenAI client not initialized")
        
        logger.warning("All extraction methods failed, returning default values")
        logger.debug(f"Extraction errors: {result['_extraction_errors']}")
        return result
        
    def _parse_job_info_response(self, response_text: str) -> Optional[Dict[str, str]]:
        """
        Helper method to parse the AI response into a structured format.
        
        Args:
            response_text: Raw text response from the AI model
            
        Returns:
            Dict with 'company_name' and 'position' if successful, None on failure
        """
        if not response_text or not isinstance(response_text, str):
            logger.warning("Empty or invalid response text provided")
            return None
            
        try:
            import json
            import re
            
            # Clean up the response
            cleaned_text = response_text.strip()
            
            # Try to find JSON in the response (allowing for some flexibility)
            json_match = re.search(r'(\{.*\})', cleaned_text, re.DOTALL)
            if not json_match:
                logger.warning(f"No JSON found in AI response. First 100 chars: {cleaned_text[:100]}...")
                return None
                
            json_str = json_match.group(1).strip()
            
            # Handle common JSON formatting issues
            json_str = json_str.replace("\n", " ").replace("\r", "")
            json_str = re.sub(r'(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', json_str)
            
            # Parse the JSON
            extracted = json.loads(json_str)
            
            if not isinstance(extracted, dict):
                logger.warning(f"AI response is not a JSON object: {type(extracted).__name__}")
                return None
                
            result = {
                "company_name": "Company",
                "position": "Position"
            }
            
            # Safely extract and validate fields
            if "company_name" in extracted and isinstance(extracted["company_name"], str):
                company = extracted["company_name"].strip()
                if company and company.lower() != "company":
                    result["company_name"] = company
                    
            if "position" in extracted and isinstance(extracted["position"], str):
                position = extracted["position"].strip()
                if position and position.lower() != "position":
                    result["position"] = position
            
            # Log if we got valid data
            if result["company_name"] != "Company" or result["position"] != "Position":
                logger.info(f"Extracted job info: {result}")
            else:
                logger.warning("No valid job info found in AI response")
                return None
                
            return result
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON from AI response: {str(e)}")
            logger.debug(f"Problematic JSON string: {json_str if 'json_str' in locals() else 'N/A'}")
            
        except Exception as e:
            logger.error(f"Error parsing AI response: {str(e)}", exc_info=True)
            
        return None
        
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
        """
        Extract the company name from a job description using AI.
        
        Args:
            job_description: The job description text to extract company name from.
            
        Returns:
            Extracted company name or "Company" if extraction fails.
        """
        prompt = f"""
        Extract just the company name from this job description. 
        Return ONLY the company name, nothing else.
        
        Job Description:
        {job_description}
        
        Company Name:
        """
        
        try:
            company_name = await self.generate_text(prompt, max_tokens=50, temperature=0.1)
            # Clean up the response to ensure it's just the company name
            company_name = company_name.strip().split('\n')[0].strip('"\'').strip()
            return company_name if company_name else "Company"
        except Exception as e:
            logger.error(f"Error extracting company name: {str(e)}")
            return "Company"

    async def generate_cover_letter(
        self, 
        cv_content: str, 
        job_description: str, 
        language: str = "English"
    ) -> Dict[str, str]:
        """Generate a personalized cover letter based on CV and job description.
        
        Args:
            cv_content: The content of the CV
            job_description: The job description
            language: The language of the cover letter
        
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
        5. Use a professional tone
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


    
    async def generate_interview_questions(self, job_description: str, question_type: str, count: int = 8, extract_company: bool = False) -> Dict[str, Any]:
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
        Evaluate this interview answer and provide feedback in exactly these six sections without any additional text or explanations:
        
        Question: {question}
        Answer: {answer}
        Question Type: {question_type}
        
        ## Strengths
        [List key strengths of the answer]
        
        ## Areas for Improvement
        [List specific areas that need improvement]
        
        ## Technical Accuracy
        [Evaluate technical correctness if applicable]
        
        ## Behavioral Example
        [Provide an example of a stronger behavioral response if applicable]
        
        ## Suggested Answer
        [Provide a model answer]
        
        ## Confidence Score
        [Provide a score from 1-10 based on answer quality]
        
        Do not include any other text, explanations, or sections beyond these six.
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