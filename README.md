# ZeroLeak AI SOC

A Living Security Intelligence Platform with autonomous detection, prediction, decision-making, and continuous learning.

## 🧠 Architecture

```
[ Sensors ]
   ↓
[ Event Stream ]
   ↓
[ Multi-Agent + Marketplace ]
   ↓
[ Judge + Co-pilot ]
   ↓
[ Action Layer ]
   ↓
[ Evaluation Engine ]
   ↓
[ Learning + Evolution Engine ]
   ↓
[ Governance Layer ]
```

## 📁 Project Structure

```
zero-leak-ai-soc/
│
├── apps/
│   ├── api/                 # Express API (brain entrypoint)
│   ├── dashboard/          # UI (future)
│
├── security/
│   ├── agents/             # Specialized security agents
│   ├── multi-agent/        # Multi-agent orchestrator
│   ├── marketplace/        # Agent marketplace with evolution
│   ├── predict/            # Predictive security
│   ├── copilot/            # Human-AI collaboration
│   ├── self-heal/          # Self-healing production
│   ├── evolution/          # Learning and adaptation
│   ├── governance/         # Safety rules and guardrails
│   ├── soc/                # AI SOC core
│   └── org-brain/          # Organization-wide intelligence
│
├── data/
│   ├── events.json         # Event storage
│   ├── memory.json         # Adaptive memory
│
├── scripts/
│   ├── setup.sh            # One-command setup
│   ├── run.sh              # Run the system
│
├── docs/                   # Documentation
├── lib/                    # Shared libraries
└── README.md
```

## 🚀 Quick Start

### One-Command Setup

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Run the System

```bash
chmod +x scripts/run.sh
./scripts/run.sh
```

The AI SOC will start on `http://localhost:3000`

## 🧪 Test It

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"type":"SECRET_LEAK","risk":9}'
```

## 📊 API Endpoints

- `POST /ingest` - Ingest security events
- `GET /status` - Get system status
- `GET /health` - Health check

## 📚 Documentation

- [AI SOC Mode](docs/AI-SOC-MODE.md)
- [Org Brain](docs/ORG-BRAIN.md)
- [Predictive Security](docs/PREDICTIVE-SECURITY.md)
- [Co-Pilot Mode](docs/COPILOT-MODE.md)
- [Multi-Agent System](docs/MULTI-AGENT.md)
- [Agent Marketplace](docs/AGENT-MARKETPLACE.md)
- [Living Security Intelligence](docs/LIVING-SECURITY-INTELLIGENCE.md)

## 🧠 Features

- 🔍 Continuous sensing from multiple sources
- 🤖 Multi-agent decision making
- 🏆 Performance-based agent selection
- 🔮 Predictive security with trend detection
- ✋ Human-in-the-loop co-pilot mode
- 🧬 Continuous learning and evolution
- ⚖️ Governance layer with safety rules
- 📊 Self-awareness and health monitoring

## 🔒 Safety

- 🧪 Sandbox execution for all agents
- 🚫 No direct system access
- ✋ Human approval for critical actions
- 📜 Full audit trail
- 🧯 Kill switch for emergency stop
- ⏱️ Rate limiting on autonomous actions

## 🚀 Next Steps

- Add Slack approval (real co-pilot)
- Add dashboard (Next.js)
- Add Redis (real-time events)
- Add auth + API keys
- Deploy on Vercel / Railway
