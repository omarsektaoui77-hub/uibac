// ZeroLeak SOC - WebSocket Server for Real-Time Updates
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3001 });

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws) => {
  console.log("📡 WebSocket client connected");
  
  ws.on("close", () => {
    console.log("📡 WebSocket client disconnected");
  });
});

console.log("🚀 WebSocket server running on ws://localhost:3001");

module.exports = { broadcast };
