import json
from pathlib import Path
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class TranslationService:
    def __init__(self, locales_dir: str = "locales"):
        self.locales: Dict[str, Dict[str, Any]] = {}
        self.locales_dir = Path(__file__).parent.parent / locales_dir
        self._load_translations()
    
    def _load_translations(self):
        """Load all translation files from the locales directory"""
        try:
            if not self.locales_dir.exists():
                logger.warning(f"Locales directory not found: {self.locales_dir}")
                return
                
            for file in self.locales_dir.glob("*.json"):
                lang = file.stem
                try:
                    with open(file, 'r', encoding='utf-8') as f:
                        self.locales[lang] = json.load(f)
                    logger.info(f"Loaded translations for language: {lang}")
                except json.JSONDecodeError as e:
                    logger.error(f"Error loading translation file {file}: {e}")
                except Exception as e:
                    logger.error(f"Unexpected error loading {file}: {e}")
                    
            if not self.locales:
                logger.warning("No translation files were loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize translations: {e}")
    
    def get(self, key: str, lang: str = "en", **kwargs) -> str:
        """
        Get a translated string by key and language.
        
        Args:
            key: Dot-separated path to the translation (e.g., 'errors.file_not_found')
            lang: Language code (default: 'en')
            **kwargs: Format arguments for the translated string
            
        Returns:
            The translated string with placeholders replaced, or the key if not found
        """
        try:
            # Default to English if requested language not available
            if lang not in self.locales:
                logger.warning(f"Language not found: {lang}, falling back to 'en'")
                lang = 'en'
            
            # Split key by dots to navigate the nested structure
            parts = key.split('.')
            value = self.locales[lang]
            
            # Traverse the nested structure
            for part in parts:
                if not isinstance(value, dict) or part not in value:
                    raise KeyError(part)
                value = value[part]
                
            # If we have a string, format it with any provided kwargs
            if isinstance(value, str):
                try:
                    return value.format(**kwargs)
                except (KeyError, ValueError) as e:
                    logger.warning(f"Error formatting string '{value}' with {kwargs}: {e}")
                    return value
            return str(value)
            
        except KeyError as e:
            # If translation not found in requested language, try English
            if lang != 'en' and 'en' in self.locales:
                logger.debug(f"Translation not found for key '{key}' in language '{lang}', trying 'en'")
                return self.get(key, 'en', **kwargs)
                
            logger.warning(f"Translation not found for key: {key} (lang: {lang})")
            return key
            
        except Exception as e:
            logger.error(f"Error getting translation for key '{key}': {e}")
            return key

# Create a singleton instance
translator = TranslationService()

# For backward compatibility
def get_translator() -> TranslationService:
    return translator
