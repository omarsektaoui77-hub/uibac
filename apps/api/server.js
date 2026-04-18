const express = require("express");
const fs = require("fs");
const path = require("path");

const { runMultiAgent } = require("../../security/multi-agent/brain");
const { runMarketplace } = require("../../security/marketplace/brain");
const { copilotBrain } = require("../../security/copilot/brain");

const app = express();
app.use(express.json());

const EVENTS_FILE = path.join(__dirname, "../../data/events.json");
const MEMORY_FILE = path.join(__dirname, "../../data/memory.json");

function loadEvents() {
  try {
    if (!fs.existsSync(EVENTS_FILE)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
  } catch (e) {
    console.error("Error loading events:", e);
    return [];
  }
}

function saveEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function loadMemory() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
  } catch (e) {
    console.error("Error loading memory:", e);
    return [];
  }
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// 🔥 ingest endpoint
app.post("/ingest", async (req, res) => {
  const events = loadEvents();
  events.push(req.body);
  saveEvents(events);

  // 🧠 multi-agent
  const multi = await runMultiAgent(events, { silent: true });

  // 🏆 marketplace
  const market = await runMarketplace(events, { silent: true });

  // 🤖 co-pilot
  const copilot = await copilotBrain(events, { silent: true });

  res.json({
    status: "processed",
    multi,
    market,
    copilot
  });
});

// 📊 status
app.get("/status", (req, res) => {
  const events = loadEvents();
  const memory = loadMemory();
  res.json({ 
    eventsCount: events.length,
    memoryCount: memory.length
  });
});

// 🧠 health
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 AI SOC running on http://localhost:${PORT}`)
);
