import os
import cohere
import openai
from typing import Optional, Dict, Any
import httpx
import asyncio

class AIClient:
    def __init__(self):
        self.cohere_client = None
        self.openai_client = None
        
        # Initialize Cohere
        cohere_api_key = os.getenv("COHERE_API_KEY")
        if cohere_api_key:
            self.cohere_client = cohere.Client(cohere_api_key)
        
        # Initialize OpenAI
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key:
            openai.api_key = openai_api_key
            self.openai_client = openai
    
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
                response = self.openai_client.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                return response.choices[0].message.content.strip()
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
    
    async def generate_cover_letter(self, cv_content: str, job_description: str, language: str = "English") -> str:
        """Generate a personalized cover letter based on CV and job description."""
        
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
        
        return await self.generate_text(prompt, max_tokens=800, temperature=0.7)
    
    async def generate_interview_questions(self, job_description: str, question_type: str) -> Dict[str, Any]:
        """Generate interview questions based on job description."""
        
        if question_type == "hr":
            prompt = f"""
            Generate 5 HR interview questions based on this job description. Focus on:
            - Soft skills
            - Teamwork and collaboration
            - Problem-solving approach
            - Career goals
            - Cultural fit
            
            Job Description:
            {job_description}
            
            Provide questions in a structured format.
            """
        else:  # technical
            prompt = f"""
            Generate 5 technical interview questions based on this job description. Include:
            - Theory questions
            - Practical coding scenarios
            - System design concepts
            - Technology-specific questions
            
            Job Description:
            {job_description}
            
            Provide questions with expected answer points.
            """
        
        questions = await self.generate_text(prompt, max_tokens=1000, temperature=0.6)
        
        return {
            "questions": questions,
            "type": question_type,
            "job_description": job_description
        }
    
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
        5. Score (1-10)
        
        Give constructive feedback with specific suggestions.
        """
        
        evaluation = await self.generate_text(prompt, max_tokens=600, temperature=0.5)
        
        return {
            "evaluation": evaluation,
            "question": question,
            "answer": answer,
            "type": question_type
        }

# Global AI client instance
ai_client = AIClient() 