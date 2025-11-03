"""
Setup script for DriftShield Monitoring Agent.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read long description from README
readme_file = Path(__file__).parent / 'README.md'
long_description = readme_file.read_text() if readme_file.exists() else ''

setup(
    name='driftshield-agent',
    version='1.0.0',
    description='Monitoring agent for ML model drift detection with DriftShield',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='DriftShield Team',
    author_email='support@driftshield.io',
    url='https://github.com/driftshield/monitoring-agent',
    packages=find_packages(),
    install_requires=[
        'pyyaml>=6.0',
        'requests>=2.31.0',
        'python-dotenv>=1.0.0',
        'numpy>=1.24.0',
        'pandas>=2.0.0',
        'scikit-learn>=1.3.0',
        'scipy>=1.11.0',
        'solana>=0.30.0',
        'solders>=0.18.0',
        'loguru>=0.7.0',
        'click>=8.1.0',
        'rich>=13.0.0',
        'httpx>=0.24.0',
    ],
    extras_require={
        'dev': [
            'pytest>=7.4.0',
            'pytest-cov>=4.1.0',
            'pytest-asyncio>=0.21.0',
            'pytest-mock>=3.11.0',
            'black>=23.0.0',
            'flake8>=6.0.0',
            'mypy>=1.4.0',
        ],
        'ml': [
            'torch>=2.0.0',
            'tensorflow>=2.13.0',
            'xgboost>=1.7.0',
            'lightgbm>=4.0.0',
            'transformers>=4.30.0',
        ],
    },
    entry_points={
        'console_scripts': [
            'driftshield-agent=agent:main',
        ],
    },
    python_requires='>=3.8',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Topic :: Scientific/Engineering :: Artificial Intelligence',
        'Topic :: System :: Monitoring',
    ],
    keywords='ml drift-detection monitoring solana blockchain',
    project_urls={
        'Documentation': 'https://docs.driftshield.io',
        'Source': 'https://github.com/driftshield/monitoring-agent',
        'Tracker': 'https://github.com/driftshield/monitoring-agent/issues',
    },
)

