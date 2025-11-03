"""
Core monitoring agent logic.
"""

import time
import logging
import hashlib
import json
from datetime import datetime
from typing import Dict, Any, Optional

import requests
import numpy as np

from .drift.statistical import calculate_drift
from .fetchers.http import HTTPMetricFetcher
from .utils.validators import validate_metrics


logger = logging.getLogger(__name__)


class MonitoringAgent:
    """
    Main monitoring agent class.
    Handles fetching metrics, computing drift, and submitting receipts.
    """
    
    def __init__(self, config: Dict[str, Any], dry_run: bool = False):
        """
        Initialize monitoring agent.
        
        Args:
            config: Configuration dictionary
            dry_run: If True, don't submit to DriftShield
        """
        self.config = config
        self.dry_run = dry_run
        
        # Extract config sections
        self.driftshield_config = config['driftshield']
        self.model_config = config['model']
        self.monitoring_config = config['monitoring']
        self.solana_config = config.get('solana', {})
        self.shadow_drive_config = config.get('shadow_drive', {})
        
        # Initialize components
        self.metric_fetcher = self._initialize_fetcher()
        
        # Baseline metrics
        self.baseline_metrics = self.model_config['baseline_metrics']
        
        logger.info("Monitoring agent initialized")
        logger.info(f"Model: {self.model_config['name']}")
        logger.info(f"Drift threshold: {self.monitoring_config['drift_threshold']}%")
    
    def _initialize_fetcher(self):
        """Initialize the appropriate metric fetcher based on config."""
        fetcher_type = self.model_config.get('fetcher_type', 'http')
        
        if fetcher_type == 'http':
            return HTTPMetricFetcher(
                endpoint=self.model_config['endpoint'],
                auth=self.model_config.get('auth', {})
            )
        else:
            raise ValueError(f"Unsupported fetcher type: {fetcher_type}")
    
    def run_once(self) -> Dict[str, Any]:
        """
        Run a single monitoring cycle.
        
        Returns:
            Dictionary with monitoring results
        """
        logger.info("Starting monitoring cycle")
        
        try:
            # 1. Fetch current metrics
            logger.info("Fetching current metrics...")
            current_metrics = self.metric_fetcher.fetch_metrics()
            
            # Validate metrics
            if not validate_metrics(current_metrics, self.baseline_metrics):
                raise ValueError("Invalid metrics returned from model")
            
            logger.info(f"Current metrics: {current_metrics}")
            
            # 2. Calculate drift
            logger.info("Calculating drift...")
            drift_result = calculate_drift(
                baseline=self.baseline_metrics,
                current=current_metrics,
                method=self.monitoring_config.get('drift_method', 'percentage')
            )
            
            drift_percentage = drift_result['drift_percentage']
            drift_detected = drift_percentage > self.monitoring_config['drift_threshold']
            
            logger.info(f"Drift: {drift_percentage:.2f}%")
            logger.info(f"Drift detected: {drift_detected}")
            
            # 3. Generate receipt
            receipt = self._generate_receipt(current_metrics, drift_result)
            
            # 4. Upload to Shadow Drive (if enabled)
            shadow_drive_url = None
            if self.shadow_drive_config.get('enabled', False) and not self.dry_run:
                logger.info("Uploading receipt to Shadow Drive...")
                shadow_drive_url = self._upload_to_shadow_drive(receipt)
                logger.info(f"Shadow Drive URL: {shadow_drive_url}")
            
            # 5. Submit to DriftShield
            if not self.dry_run:
                logger.info("Submitting to DriftShield API...")
                self._submit_to_driftshield(receipt, shadow_drive_url)
                logger.info("Successfully submitted to DriftShield")
            else:
                logger.info("DRY RUN: Skipping submission to DriftShield")
            
            # 6. Submit on-chain (if configured)
            if self.solana_config.get('enabled', False) and not self.dry_run:
                logger.info("Submitting on-chain...")
                tx_signature = self._submit_onchain(receipt, shadow_drive_url)
                logger.info(f"Transaction signature: {tx_signature}")
            
            return {
                'success': True,
                'drift_percentage': drift_percentage,
                'drift_detected': drift_detected,
                'metrics': current_metrics,
                'receipt': receipt,
                'shadow_drive_url': shadow_drive_url,
                'timestamp': datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Monitoring cycle failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def run_daemon(self):
        """
        Run agent as daemon (continuous monitoring).
        """
        frequency_hours = self.monitoring_config['frequency_hours']
        frequency_seconds = frequency_hours * 3600
        
        logger.info(f"Starting daemon mode (frequency: {frequency_hours}h)")
        
        cycle_count = 0
        while True:
            cycle_count += 1
            logger.info(f"Starting cycle #{cycle_count}")
            
            try:
                result = self.run_once()
                
                if result['success']:
                    logger.info(f"Cycle #{cycle_count} completed successfully")
                else:
                    logger.error(f"Cycle #{cycle_count} failed: {result.get('error')}")
            
            except Exception as e:
                logger.error(f"Cycle #{cycle_count} error: {e}", exc_info=True)
            
            # Wait for next cycle
            logger.info(f"Waiting {frequency_hours}h until next cycle...")
            time.sleep(frequency_seconds)
    
    def _generate_receipt(self, metrics: Dict[str, float], drift_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate monitoring receipt.
        
        Args:
            metrics: Current metrics
            drift_result: Drift calculation results
            
        Returns:
            Receipt dictionary
        """
        receipt = {
            'model_id': self.driftshield_config['model_id'],
            'model_name': self.model_config['name'],
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics,
            'baseline_metrics': self.baseline_metrics,
            'drift_percentage': drift_result['drift_percentage'],
            'drift_detected': drift_result['drift_percentage'] > self.monitoring_config['drift_threshold'],
            'drift_details': drift_result,
            'agent_version': '1.0.0',
            'config': {
                'drift_threshold': self.monitoring_config['drift_threshold'],
                'drift_method': self.monitoring_config.get('drift_method', 'percentage')
            }
        }
        
        # Calculate receipt hash
        receipt_json = json.dumps(receipt, sort_keys=True)
        receipt_hash = hashlib.sha256(receipt_json.encode()).hexdigest()
        receipt['receipt_hash'] = receipt_hash
        
        return receipt
    
    def _upload_to_shadow_drive(self, receipt: Dict[str, Any]) -> str:
        """
        Upload receipt to Shadow Drive.
        
        Args:
            receipt: Receipt dictionary
            
        Returns:
            Shadow Drive URL
        """
        try:
            from .shadow_drive.uploader import ShadowDriveUploader
            
            # Initialize uploader
            uploader = ShadowDriveUploader(self.shadow_drive_config)
            
            # Upload receipt
            url = uploader.upload(
                receipt=receipt,
                model_id=self.driftshield_config['model_id']
            )
            
            logger.info(f"Receipt uploaded to Shadow Drive: {url}")
            
            return url
            
        except Exception as e:
            logger.error(f"Shadow Drive upload failed: {e}")
            
            # Fallback to mock URL
            receipt_hash = receipt['receipt_hash']
            mock_url = f"https://shdw-drive.genesysgo.net/receipts/{receipt_hash}.json"
            logger.warning(f"Using mock URL: {mock_url}")
            
            return mock_url
    
    def _submit_to_driftshield(self, receipt: Dict[str, Any], shadow_drive_url: Optional[str] = None):
        """
        Submit receipt to DriftShield API.
        
        Args:
            receipt: Receipt dictionary
            shadow_drive_url: URL to receipt on Shadow Drive
        """
        api_url = self.driftshield_config['api_url']
        api_key = self.driftshield_config['api_key']
        model_id = self.driftshield_config['model_id']
        
        endpoint = f"{api_url}/api/v1/models/{model_id}/receipts"
        
        payload = {
            'metrics': receipt['metrics'],
            'drift_percentage': receipt['drift_percentage'],
            'shadow_drive_url': shadow_drive_url or '',
            'receipt_hash': receipt['receipt_hash'],
            'timestamp': receipt['timestamp']
        }
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        
        return response.json()
    
    def _submit_onchain(self, receipt: Dict[str, Any], shadow_drive_url: Optional[str] = None) -> str:
        """
        Submit receipt on-chain to Solana.
        
        Args:
            receipt: Receipt dictionary
            shadow_drive_url: URL to receipt on Shadow Drive
            
        Returns:
            Transaction signature
        """
        # Mock implementation
        # In production, use actual Solana SDK
        
        # TODO: Implement actual Solana transaction
        # from .solana.transactions import submit_receipt
        # signature = submit_receipt(
        #     model_id=self.driftshield_config['model_id'],
        #     receipt_hash=receipt['receipt_hash'],
        #     shadow_drive_url=shadow_drive_url,
        #     wallet=self.solana_config['wallet_path']
        # )
        
        mock_signature = f"sig_{int(time.time())}_{receipt['receipt_hash'][:8]}"
        
        return mock_signature

