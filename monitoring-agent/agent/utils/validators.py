"""
Validation utilities for monitoring agent.
"""

from typing import Dict, Any


def validate_metrics(metrics: Dict[str, float], baseline: Dict[str, float]) -> bool:
    """
    Validate that metrics match expected structure.
    
    Args:
        metrics: Current metrics
        baseline: Baseline metrics
        
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(metrics, dict):
        return False
    
    if not isinstance(baseline, dict):
        return False
    
    # Check that all baseline metrics are present in current metrics
    for key in baseline.keys():
        if key not in metrics:
            return False
        
        # Check that values are numeric
        if not isinstance(metrics[key], (int, float)):
            return False
    
    return True


def validate_config(config: Dict[str, Any]) -> bool:
    """
    Validate configuration structure.
    
    Args:
        config: Configuration dictionary
        
    Returns:
        True if valid, raises ValueError if invalid
    """
    required_sections = ['driftshield', 'model', 'monitoring']
    
    for section in required_sections:
        if section not in config:
            raise ValueError(f"Missing required config section: {section}")
    
    return True


def validate_receipt(receipt: Dict[str, Any]) -> bool:
    """
    Validate receipt structure.
    
    Args:
        receipt: Receipt dictionary
        
    Returns:
        True if valid, False otherwise
    """
    required_fields = [
        'model_id',
        'timestamp',
        'metrics',
        'baseline_metrics',
        'drift_percentage',
        'drift_detected',
        'receipt_hash'
    ]
    
    for field in required_fields:
        if field not in receipt:
            return False
    
    return True

