"""
HTTP metric fetcher for REST API endpoints.
"""

import logging
from typing import Dict, Any
import requests

logger = logging.getLogger(__name__)


class HTTPMetricFetcher:
    """
    Fetch metrics from HTTP/REST API endpoint.
    """
    
    def __init__(self, endpoint: str, auth: Dict[str, Any] = None):
        """
        Initialize HTTP fetcher.
        
        Args:
            endpoint: API endpoint URL
            auth: Authentication configuration
        """
        self.endpoint = endpoint
        self.auth = auth or {}
    
    def fetch_metrics(self) -> Dict[str, float]:
        """
        Fetch current metrics from API endpoint.
        
        Returns:
            Dictionary of metric values
            
        Raises:
            Exception if fetch fails
        """
        logger.info(f"Fetching metrics from {self.endpoint}")
        
        try:
            headers = self._get_auth_headers()
            
            response = requests.get(
                self.endpoint,
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            # Extract metrics from response
            # Expected format: {"metrics": {"accuracy": 0.94, ...}}
            # or direct: {"accuracy": 0.94, ...}
            
            if 'metrics' in data:
                metrics = data['metrics']
            else:
                metrics = data
            
            logger.info(f"Fetched metrics: {metrics}")
            
            return metrics
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch metrics: {e}")
            raise
        except Exception as e:
            logger.error(f"Error processing metrics: {e}")
            raise
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """
        Get authentication headers based on auth config.
        
        Returns:
            Dictionary of headers
        """
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'DriftShield-Monitoring-Agent/1.0'
        }
        
        auth_method = self.auth.get('method', 'none')
        
        if auth_method == 'bearer':
            token = self.auth.get('token')
            if token:
                headers['Authorization'] = f'Bearer {token}'
        
        elif auth_method == 'api_key':
            api_key = self.auth.get('api_key')
            if api_key:
                headers['X-API-Key'] = api_key
        
        elif auth_method == 'basic':
            # Basic auth is handled by requests.auth, not headers
            pass
        
        return headers

