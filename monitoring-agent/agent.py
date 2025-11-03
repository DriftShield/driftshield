#!/usr/bin/env python3
"""
DriftShield Monitoring Agent
Main entry point for the monitoring agent.
"""

import argparse
import sys
import time
import logging
from pathlib import Path

from agent.core import MonitoringAgent
from agent.config import load_config
from agent.utils.logger import setup_logger


def main():
    parser = argparse.ArgumentParser(
        description='DriftShield Monitoring Agent - ML Model Drift Detection'
    )
    
    parser.add_argument(
        '--config',
        '-c',
        type=str,
        required=True,
        help='Path to configuration file (YAML or JSON)'
    )
    
    parser.add_argument(
        '--once',
        action='store_true',
        help='Run monitoring once and exit (default: daemon mode)'
    )
    
    parser.add_argument(
        '--daemon',
        action='store_true',
        help='Run as daemon (continuous monitoring)'
    )
    
    parser.add_argument(
        '--frequency',
        '-f',
        type=int,
        help='Override monitoring frequency in hours'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run without submitting to DriftShield (for testing)'
    )
    
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Enable verbose logging (DEBUG level)'
    )
    
    parser.add_argument(
        '--log-file',
        type=str,
        help='Override log file path'
    )
    
    args = parser.parse_args()
    
    # Load configuration
    try:
        config = load_config(args.config)
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)
    
    # Override frequency if specified
    if args.frequency:
        config['monitoring']['frequency_hours'] = args.frequency
    
    # Setup logging
    log_level = logging.DEBUG if args.verbose else config.get('logging', {}).get('level', 'INFO')
    log_file = args.log_file or config.get('logging', {}).get('file', 'logs/agent.log')
    
    logger = setup_logger(log_level, log_file)
    
    # Initialize agent
    try:
        agent = MonitoringAgent(config, dry_run=args.dry_run)
        logger.info("DriftShield Monitoring Agent initialized")
        logger.info(f"Model: {config['model']['name']}")
        logger.info(f"Model ID: {config['driftshield']['model_id']}")
    except Exception as e:
        logger.error(f"Failed to initialize agent: {e}")
        sys.exit(1)
    
    # Run agent
    try:
        if args.once:
            # Run once and exit
            logger.info("Running monitoring cycle (once)")
            result = agent.run_once()
            
            if result['success']:
                logger.info("Monitoring cycle completed successfully")
                logger.info(f"Drift: {result['drift_percentage']:.2f}%")
                logger.info(f"Drift detected: {result['drift_detected']}")
                sys.exit(0)
            else:
                logger.error(f"Monitoring cycle failed: {result.get('error')}")
                sys.exit(1)
        
        else:
            # Run as daemon
            logger.info("Starting daemon mode")
            frequency_hours = config['monitoring']['frequency_hours']
            logger.info(f"Monitoring frequency: every {frequency_hours} hour(s)")
            
            agent.run_daemon()
    
    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Agent error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()

