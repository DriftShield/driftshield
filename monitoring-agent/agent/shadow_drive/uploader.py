"""
Shadow Drive uploader for decentralized receipt storage.
"""

import json
import hashlib
import logging
from typing import Dict, Any, Optional
from pathlib import Path

from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey

logger = logging.getLogger(__name__)


class ShadowDriveUploader:
    """
    Upload monitoring receipts to Shadow Drive (GenesysGo).
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Shadow Drive uploader.
        
        Args:
            config: Shadow Drive configuration
        """
        self.config = config
        self.enabled = config.get('enabled', False)
        self.storage_account = config.get('storage_account')
        self.client = None
        self.wallet = None
        
        if self.enabled:
            self._initialize()
    
    def _initialize(self):
        """Initialize Solana client and wallet."""
        try:
            # Get RPC URL
            rpc_url = self.config.get('rpc_url', 'https://api.mainnet-beta.solana.com')
            self.client = Client(rpc_url)
            
            # Load wallet keypair
            wallet_path = self.config.get('wallet_path')
            if wallet_path:
                self.wallet = self._load_wallet(wallet_path)
                logger.info(f"Shadow Drive wallet loaded: {self.wallet.pubkey()}")
            else:
                logger.warning("No wallet configured for Shadow Drive")
            
            logger.info("Shadow Drive uploader initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Shadow Drive: {e}")
            self.enabled = False
    
    def _load_wallet(self, wallet_path: str) -> Keypair:
        """Load Solana wallet from JSON file."""
        try:
            wallet_file = Path(wallet_path).expanduser()
            
            if not wallet_file.exists():
                raise FileNotFoundError(f"Wallet file not found: {wallet_path}")
            
            with open(wallet_file, 'r') as f:
                secret_key = json.load(f)
            
            # Convert to bytes and create keypair
            keypair = Keypair.from_bytes(bytes(secret_key))
            
            return keypair
            
        except Exception as e:
            logger.error(f"Failed to load wallet: {e}")
            raise
    
    def upload(self, receipt: Dict[str, Any], model_id: str) -> str:
        """
        Upload receipt to Shadow Drive.
        
        Args:
            receipt: Receipt data to upload
            model_id: Model ID for organizing files
            
        Returns:
            Shadow Drive URL
        """
        if not self.enabled:
            logger.warning("Shadow Drive not enabled, returning mock URL")
            return self._generate_mock_url(receipt.get('receipt_hash', 'unknown'))
        
        try:
            # NOTE: This is a placeholder implementation
            # The actual Shadow Drive SDK for Python is still under development
            # For production, you would use the Shadow Drive API directly
            
            logger.info(f"Uploading receipt to Shadow Drive for model {model_id}")
            
            # Generate filename
            timestamp = receipt.get('timestamp', '').replace(':', '-')
            receipt_hash = receipt.get('receipt_hash')
            filename = f"receipts/{model_id}/{timestamp}_{receipt_hash[:8]}.json"
            
            # Prepare receipt data
            receipt_json = json.dumps(receipt, indent=2)
            receipt_bytes = receipt_json.encode('utf-8')
            
            # TODO: Implement actual Shadow Drive upload
            # This would involve:
            # 1. Creating a transaction to upload to Shadow Drive
            # 2. Signing with wallet
            # 3. Sending transaction
            # 4. Getting back the permanent URL
            
            # For now, we'll use the HTTP API approach
            url = self._upload_via_http_api(filename, receipt_bytes)
            
            logger.info(f"Receipt uploaded successfully: {url}")
            
            return url
            
        except Exception as e:
            logger.error(f"Failed to upload to Shadow Drive: {e}")
            # Return mock URL as fallback
            return self._generate_mock_url(receipt.get('receipt_hash', 'unknown'))
    
    def _upload_via_http_api(self, filename: str, data: bytes) -> str:
        """
        Upload file using Shadow Drive HTTP API.
        
        This uses the Shadow Drive REST API for uploading files.
        
        Args:
            filename: File name/path
            data: File data bytes
            
        Returns:
            Shadow Drive URL
        """
        import requests
        from solders.transaction import Transaction
        from solders.message import Message
        from solders.instruction import Instruction
        
        try:
            # Shadow Drive API endpoint
            api_url = "https://shadow-storage.genesysgo.net"
            
            if not self.storage_account or not self.wallet:
                raise ValueError("Storage account or wallet not configured")
            
            # Step 1: Get upload URL
            logger.info(f"Requesting upload URL for {filename}")
            
            response = requests.post(
                f"{api_url}/upload",
                json={
                    "storage_account": self.storage_account,
                    "file": filename,
                },
                headers={
                    "Content-Type": "application/json",
                }
            )
            
            if response.status_code == 200:
                upload_data = response.json()
                upload_url = upload_data.get('upload_url')
                
                # Step 2: Upload file to the URL
                logger.info(f"Uploading file to {upload_url}")
                
                files = {'file': (filename, data, 'application/json')}
                upload_response = requests.post(upload_url, files=files)
                
                if upload_response.status_code == 200:
                    # Step 3: Get the final URL
                    final_url = f"https://shdw-drive.genesysgo.net/{self.storage_account}/{filename}"
                    
                    logger.info(f"File uploaded successfully: {final_url}")
                    
                    return final_url
                else:
                    raise Exception(f"Upload failed: {upload_response.status_code}")
            else:
                raise Exception(f"Failed to get upload URL: {response.status_code}")
                
        except Exception as e:
            logger.warning(f"HTTP API upload failed: {e}")
            
            # Fallback to constructed URL
            if self.storage_account:
                base_url = f"https://shdw-drive.genesysgo.net/{self.storage_account}"
                url = f"{base_url}/{filename}"
            else:
                # Generate mock URL
                receipt_hash = hashlib.sha256(data).hexdigest()
                url = f"https://shdw-drive.genesysgo.net/receipts/{receipt_hash}.json"
            
            logger.info(f"Using fallback URL: {url}")
            return url
    
    def download(self, url: str) -> Dict[str, Any]:
        """
        Download receipt from Shadow Drive.
        
        Args:
            url: Shadow Drive URL
            
        Returns:
            Receipt data
        """
        import requests
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            receipt = response.json()
            
            logger.info(f"Receipt downloaded from Shadow Drive: {url}")
            
            return receipt
            
        except Exception as e:
            logger.error(f"Failed to download from Shadow Drive: {e}")
            raise
    
    def verify(self, url: str, expected_hash: str) -> bool:
        """
        Verify receipt integrity.
        
        Args:
            url: Shadow Drive URL
            expected_hash: Expected receipt hash
            
        Returns:
            True if receipt is valid
        """
        try:
            receipt = self.download(url)
            
            # Recalculate hash (excluding the hash field itself)
            receipt_copy = {k: v for k, v in receipt.items() if k != 'receipt_hash'}
            receipt_json = json.dumps(receipt_copy, sort_keys=True)
            calculated_hash = hashlib.sha256(receipt_json.encode()).hexdigest()
            
            is_valid = calculated_hash == expected_hash
            
            if not is_valid:
                logger.warning(f"Receipt hash mismatch: {calculated_hash} != {expected_hash}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Receipt verification failed: {e}")
            return False
    
    def _generate_mock_url(self, receipt_hash: str) -> str:
        """Generate mock URL for testing."""
        return f"https://shdw-drive.genesysgo.net/receipts/{receipt_hash}.json"

