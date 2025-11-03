"""
Statistical drift detection methods.
"""

from typing import Dict, Any
import numpy as np
from scipy import stats


def calculate_drift(
    baseline: Dict[str, float],
    current: Dict[str, float],
    method: str = 'percentage'
) -> Dict[str, Any]:
    """
    Calculate drift between baseline and current metrics.
    
    Args:
        baseline: Baseline metrics
        current: Current metrics
        method: Drift calculation method (percentage, ks_test, psi)
        
    Returns:
        Dictionary with drift results
    """
    if method == 'percentage':
        return _calculate_percentage_drift(baseline, current)
    elif method == 'ks_test':
        return _calculate_ks_drift(baseline, current)
    elif method == 'psi':
        return _calculate_psi_drift(baseline, current)
    else:
        raise ValueError(f"Unknown drift method: {method}")


def _calculate_percentage_drift(baseline: Dict[str, float], current: Dict[str, float]) -> Dict[str, Any]:
    """Calculate percentage-based drift."""
    drift_per_metric = {}
    total_drift = 0
    count = 0
    
    for metric_name in baseline.keys():
        if metric_name in current:
            baseline_value = baseline[metric_name]
            current_value = current[metric_name]
            
            if baseline_value != 0:
                drift = abs((current_value - baseline_value) / baseline_value) * 100
                drift_per_metric[metric_name] = {
                    'baseline': baseline_value,
                    'current': current_value,
                    'drift_pct': drift
                }
                total_drift += drift
                count += 1
    
    avg_drift = total_drift / count if count > 0 else 0
    
    return {
        'drift_percentage': avg_drift,
        'drift_per_metric': drift_per_metric,
        'method': 'percentage'
    }


def _calculate_ks_drift(baseline: Dict[str, float], current: Dict[str, float]) -> Dict[str, Any]:
    """Calculate KS test-based drift."""
    # For metric-based drift, we compare distributions
    # This is a simplified implementation
    
    # Convert to arrays for comparison
    baseline_values = np.array(list(baseline.values()))
    current_values = np.array(list(current.values()))
    
    # Perform KS test
    statistic, p_value = stats.ks_2samp(baseline_values, current_values)
    
    # Convert to percentage for consistency
    drift_percentage = statistic * 100
    
    return {
        'drift_percentage': drift_percentage,
        'ks_statistic': statistic,
        'p_value': p_value,
        'drift_detected': p_value < 0.05,
        'method': 'ks_test'
    }


def _calculate_psi_drift(baseline: Dict[str, float], current: Dict[str, float]) -> Dict[str, Any]:
    """Calculate Population Stability Index (PSI)."""
    # PSI = Σ (actual% - expected%) * ln(actual% / expected%)
    
    baseline_values = np.array(list(baseline.values()))
    current_values = np.array(list(current.values()))
    
    # Normalize to get percentages
    baseline_pct = baseline_values / baseline_values.sum()
    current_pct = current_values / current_values.sum()
    
    # Calculate PSI
    psi = np.sum((current_pct - baseline_pct) * np.log(current_pct / baseline_pct))
    
    # Convert to percentage
    drift_percentage = abs(psi) * 100
    
    # PSI interpretation:
    # < 0.1: No significant change
    # 0.1-0.25: Moderate change
    # > 0.25: Significant change
    
    return {
        'drift_percentage': drift_percentage,
        'psi': psi,
        'drift_level': 'significant' if abs(psi) > 0.25 else ('moderate' if abs(psi) > 0.1 else 'low'),
        'method': 'psi'
    }

