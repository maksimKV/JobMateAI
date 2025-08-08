from fastapi import Request
from fastapi.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from fastapi.responses import Response
from typing import Optional, Callable, Awaitable, Any
import logging
from utils.translations import translator

logger = logging.getLogger(__name__)

class LanguageMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle language preferences from request headers or query parameters.
    Sets the language in the request state for use in route handlers.
    """
    
    def __init__(self, app, default_language: str = 'en', supported_languages: list = None):
        super().__init__(app)
        self.default_language = default_language
        self.supported_languages = supported_languages or ['en', 'bg']
        logger.info(f"Initialized LanguageMiddleware with supported languages: {self.supported_languages}")
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """
        Process the request to determine the preferred language.
        
        Priority order for language detection:
        1. Query parameter: ?lang=xx
        2. Accept-Language header
        3. Default language (en)
        """
        # Initialize request state for language if not exists
        if not hasattr(request.state, 'language'):
            request.state.language = self.default_language
        
        # Check query parameter first (highest priority)
        lang_param = request.query_params.get('lang')
        if lang_param and lang_param in self.supported_languages:
            request.state.language = lang_param
            logger.debug(f"Language set from query parameter: {lang_param}")
        else:
            # Check Accept-Language header
            accept_language = request.headers.get('accept-language')
            if accept_language:
                # Parse the header and find the first supported language
                for lang in accept_language.replace(' ', '').split(','):
                    # Extract language code (e.g., 'en-US' -> 'en')
                    lang_code = lang.split(';')[0].split('-')[0].lower()
                    if lang_code in self.supported_languages:
                        request.state.language = lang_code
                        logger.debug(f"Language set from Accept-Language header: {lang_code}")
                        break
        
        # Ensure the language is set to a valid value
        if not hasattr(request.state, 'language') or request.state.language not in self.supported_languages:
            request.state.language = self.default_language
            logger.debug(f"Using default language: {self.default_language}")
        
        # Add language to response headers
        response = await call_next(request)
        response.headers['Content-Language'] = request.state.language
        
        return response

def get_request_language(request: Request) -> str:
    """
    Helper function to get the current request's language.
    
    Args:
        request: The FastAPI request object
        
    Returns:
        The language code (e.g., 'en', 'bg')
    """
    return getattr(request.state, 'language', 'en')
