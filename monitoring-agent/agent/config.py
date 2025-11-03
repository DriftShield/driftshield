"""
Configuration management for DriftShield monitoring agent.
"""

import yaml
import json
from pathlib import Path
from typing import Dict, Any


def load_config(config_path: str) -> Dict[str, Any]:
    """
    Load configuration from YAML or JSON file.
    
    Args:
        config_path: Path to configuration file
        
    Returns:
        Configuration dictionary
        
    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If config format is invalid
    """
    config_file = Path(config_path)
    
    if not config_file.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    # Determine file type from extension
    if config_file.suffix in ['.yaml', '.yml']:
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
    elif config_file.suffix == '.json':
        with open(config_file, 'r') as f:
            config = json.load(f)
    else:
        raise ValueError(f"Unsupported config file format: {config_file.suffix}")
    
    # Validate required fields
    _validate_config(config)
    
    return config


def _validate_config(config: Dict[str, Any]):
    """
    Validate configuration has required fields.
    
    Args:
        config: Configuration dictionary
        
    Raises:
        ValueError: If required fields are missing
    """
    required_sections = ['driftshield', 'model', 'monitoring']
    
    for section in required_sections:
        if section not in config:
            raise ValueError(f"Missing required config section: {section}")
    
    # Validate driftshield section
    driftshield = config['driftshield']
    if 'api_url' not in driftshield:
        raise ValueError("Missing driftshield.api_url")
    if 'model_id' not in driftshield:
        raise ValueError("Missing driftshield.model_id")
    if 'api_key' not in driftshield:
        raise ValueError("Missing driftshield.api_key")
    
    # Validate model section
    model = config['model']
    if 'name' not in model:
        raise ValueError("Missing model.name")
    if 'endpoint' not in model:
        raise ValueError("Missing model.endpoint")
    if 'baseline_metrics' not in model:
        raise ValueError("Missing model.baseline_metrics")
    
    # Validate monitoring section
    monitoring = config['monitoring']
    if 'frequency_hours' not in monitoring:
        raise ValueError("Missing monitoring.frequency_hours")
    if 'drift_threshold' not in monitoring:
        raise ValueError("Missing monitoring.drift_threshold")


def save_config(config: Dict[str, Any], output_path: str):
    """
    Save configuration to file.
    
    Args:
        config: Configuration dictionary
        output_path: Output file path
    """
    output_file = Path(output_path)
    
    # Determine format from extension
    if output_file.suffix in ['.yaml', '.yml']:
        with open(output_file, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)
    elif output_file.suffix == '.json':
        with open(output_file, 'w') as f:
            json.dump(config, f, indent=2)
    else:
        raise ValueError(f"Unsupported config file format: {output_file.suffix}")

