# DriftShield Monitoring Agent

Python-based monitoring agent for automatically tracking ML model drift and submitting receipts to DriftShield.

## 🎯 Overview

The DriftShield Monitoring Agent is a lightweight Python application that:
- Fetches metrics from your ML model
- Computes drift against baseline metrics
- Submits monitoring receipts to DriftShield API
- Uploads detailed reports to Shadow Drive
- Runs as a daemon for continuous monitoring

## 📋 Features

- ✅ **Automatic Monitoring** - Configurable monitoring frequency
- ✅ **Drift Detection** - Multiple drift detection methods
- ✅ **Data Quality Checks** - Validate input data quality
- ✅ **Feature Drift** - Per-feature drift analysis
- ✅ **Shadow Drive Upload** - Decentralized receipt storage
- ✅ **Solana Integration** - On-chain receipt submission
- ✅ **Flexible Backends** - Support for REST APIs, S3, local models
- ✅ **Error Handling** - Robust retry logic and alerting

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip or conda
- Your ML model deployed and accessible
- DriftShield account with registered model

### Installation

```bash
# Clone the repository
git clone https://github.com/driftshield/monitoring-agent.git
cd monitoring-agent

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

1. **Download your model config from DriftShield:**

```bash
# From DriftShield dashboard or API
curl -X POST https://api.driftshield.io/api/v1/models/{modelId}/monitoring-agent/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o config.yaml
```

2. **Or create `config.yaml` manually:**

```yaml
# DriftShield Configuration
driftshield:
  api_url: https://api.driftshield.io
  api_key: your_api_key_here
  model_id: your_model_id_here

# Model Configuration
model:
  name: My ML Model
  type: classification  # classification, regression, etc.
  endpoint: https://your-model-api.com/metrics
  auth:
    method: bearer  # bearer, api_key, none
    token: your_model_api_token
  
  # Baseline metrics (from training/validation)
  baseline_metrics:
    accuracy: 0.95
    precision: 0.92
    recall: 0.94
    f1_score: 0.93

# Monitoring Settings
monitoring:
  frequency_hours: 1  # How often to check
  drift_threshold: 5.0  # Drift percentage threshold
  
  # Data quality checks
  data_quality:
    check_missing: true
    check_outliers: true
    max_missing_pct: 5.0
    
  # Feature drift settings
  feature_drift:
    enabled: true
    method: ks_test  # ks_test, chi_square, psi
    threshold: 0.05

# Solana Configuration
solana:
  network: mainnet-beta  # devnet, testnet, mainnet-beta
  rpc_url: https://api.mainnet-beta.solana.com
  wallet_path: ~/.config/solana/id.json  # Path to keypair

# Shadow Drive
shadow_drive:
  enabled: true
  storage_account: your_shadow_drive_account

# Logging
logging:
  level: INFO  # DEBUG, INFO, WARNING, ERROR
  file: logs/agent.log
```

### Running the Agent

```bash
# Run once
python agent.py --config config.yaml --once

# Run as daemon (continuous monitoring)
python agent.py --config config.yaml --daemon

# Run with custom frequency (overrides config)
python agent.py --config config.yaml --daemon --frequency 2  # Every 2 hours

# Dry run (don't submit to DriftShield)
python agent.py --config config.yaml --once --dry-run
```

## 📊 How It Works

### Monitoring Flow

```
┌─────────────────────┐
│  1. Fetch Metrics   │  ← Query your model API
│     from Model      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Compute Drift   │  ← Compare with baseline
│     & Data Quality  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Generate        │  ← Create detailed report
│     Receipt JSON    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. Upload to       │  ← Decentralized storage
│     Shadow Drive    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  5. Submit to       │  ← Update DriftShield
│     DriftShield     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  6. Submit On-Chain │  ← Solana transaction
│     (Optional)      │
└─────────────────────┘
```

### Drift Detection Methods

The agent supports multiple drift detection algorithms:

1. **Statistical Tests**
   - Kolmogorov-Smirnov (KS) test
   - Chi-square test
   - Population Stability Index (PSI)

2. **Performance-Based**
   - Accuracy degradation
   - Precision/Recall changes
   - F1 score delta

3. **Distribution-Based**
   - Jensen-Shannon divergence
   - Wasserstein distance
   - KL divergence

## 🔧 Advanced Usage

### Custom Metric Fetcher

Create a custom fetcher for your specific ML framework:

```python
# custom_fetcher.py
from agent.fetchers.base import BaseMetricFetcher

class MyModelFetcher(BaseMetricFetcher):
    def fetch_metrics(self):
        """Fetch metrics from your custom model."""
        # Your custom logic here
        return {
            'accuracy': 0.94,
            'precision': 0.91,
            'recall': 0.93,
            'predictions': predictions,
            'actuals': actuals
        }
```

Then use it:

```python
from custom_fetcher import MyModelFetcher

agent = MonitoringAgent(config, fetcher=MyModelFetcher())
agent.run()
```

### Webhooks & Alerts

Configure webhooks to receive alerts:

```yaml
# config.yaml
alerts:
  webhook_url: https://your-webhook.com/alerts
  
  # Alert conditions
  conditions:
    - type: drift_detected
      webhook: true
      email: true
    - type: critical_drift  # > 2x threshold
      webhook: true
      email: true
      sms: true
    - type: data_quality_issue
      webhook: true
```

### Integration with Popular ML Frameworks

#### Scikit-learn

```python
from agent import MonitoringAgent
from agent.integrations import SklearnMonitor

# Load your trained model
import joblib
model = joblib.load('model.pkl')

# Create monitor
monitor = SklearnMonitor(model, config)

# Run monitoring
monitor.run_once()
```

#### PyTorch

```python
from agent.integrations import TorchMonitor

monitor = TorchMonitor(model, config)
monitor.run_daemon()
```

#### TensorFlow

```python
from agent.integrations import TensorFlowMonitor

monitor = TensorFlowMonitor(model, config)
monitor.run_daemon()
```

## 📁 Project Structure

```
monitoring-agent/
├── agent/
│   ├── __init__.py
│   ├── core.py               # Main agent logic
│   ├── config.py             # Configuration management
│   ├── drift/                # Drift detection algorithms
│   │   ├── statistical.py
│   │   ├── performance.py
│   │   └── distribution.py
│   ├── fetchers/             # Metric fetching
│   │   ├── base.py
│   │   ├── http.py          # REST API fetcher
│   │   ├── local.py         # Local model fetcher
│   │   └── s3.py            # S3 fetcher
│   ├── integrations/         # ML framework integrations
│   │   ├── sklearn.py
│   │   ├── torch.py
│   │   ├── tensorflow.py
│   │   └── huggingface.py
│   ├── solana/              # Solana integration
│   │   ├── client.py
│   │   └── transactions.py
│   ├── shadow_drive/        # Shadow Drive client
│   │   └── uploader.py
│   └── utils/               # Utilities
│       ├── logger.py
│       ├── crypto.py
│       └── validators.py
├── tests/                   # Unit tests
│   ├── test_drift.py
│   ├── test_fetchers.py
│   └── test_integration.py
├── examples/                # Example configs & usage
│   ├── sklearn_example.py
│   ├── pytorch_example.py
│   └── custom_fetcher.py
├── agent.py                 # Main entry point
├── requirements.txt         # Python dependencies
├── setup.py                 # Package setup
├── Dockerfile              # Container image
├── docker-compose.yml      # Docker compose
└── README.md               # This file
```

## 🐳 Docker Deployment

### Using Docker

```bash
# Build image
docker build -t driftshield-agent .

# Run container
docker run -d \
  --name driftshield-agent \
  -v $(pwd)/config.yaml:/app/config.yaml \
  -v ~/.config/solana:/root/.config/solana \
  driftshield-agent
```

### Using Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  agent:
    image: driftshield-agent:latest
    build: .
    volumes:
      - ./config.yaml:/app/config.yaml
      - ~/.config/solana:/root/.config/solana
      - ./logs:/app/logs
    environment:
      - DRIFTSHIELD_API_KEY=${DRIFTSHIELD_API_KEY}
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
    restart: unless-stopped
```

```bash
docker-compose up -d
```

## 🔒 Security Best Practices

1. **Protect API Keys**: Never commit API keys to git
2. **Use Environment Variables**: Store secrets in env vars
3. **Secure Wallet**: Protect your Solana wallet keypair
4. **Use HTTPS**: Always use HTTPS for model endpoints
5. **Rotate Keys**: Regularly rotate API keys and tokens
6. **Minimal Permissions**: Give agent only necessary permissions

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=agent --cov-report=html

# Run specific test
pytest tests/test_drift.py

# Run integration tests
pytest tests/test_integration.py
```

## 📚 API Reference

See [API_REFERENCE.md](./docs/API_REFERENCE.md) for detailed API documentation.

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](./LICENSE)

## 🆘 Support

- **Documentation**: https://docs.driftshield.io
- **Issues**: https://github.com/driftshield/monitoring-agent/issues
- **Discord**: https://discord.gg/driftshield
- **Email**: support@driftshield.io

## 🎯 Roadmap

- [ ] Support for more ML frameworks (XGBoost, LightGBM)
- [ ] Built-in model explanability (SHAP, LIME)
- [ ] Automatic retraining triggers
- [ ] Multi-model monitoring
- [ ] Real-time streaming support
- [ ] Advanced visualization dashboard
- [ ] Kubernetes operator
- [ ] Cloud integrations (AWS SageMaker, Azure ML, GCP Vertex)

## ⚡ Performance

- **CPU Usage**: < 5% during monitoring
- **Memory**: < 200MB for most models
- **Network**: Minimal (only during fetch/submit)
- **Disk**: Logs rotated automatically

## 🌟 Examples

See the [examples/](./examples/) directory for:
- Classification model monitoring
- Regression model monitoring
- Custom fetcher implementation
- Multi-model monitoring
- Integration with MLflow
- Integration with Weights & Biases

---

**Made with ❤️ by the DriftShield team**

