// ZeroLeak Co-Pilot Mode - Approval Gate
// Manages human approval for high-risk actions

/**
 * Require approval for actions based on tier
 */
async function requireApproval(tier, actions, options = {}) {
  const { autoApprove = false, timeout = 60000 } = options;
  
  if (tier === "LOW") {
    return { approved: true, reason: "Auto-approved for LOW tier" };
  }

  console.log("⏳ Waiting for approval:", actions);

  // Simulate approval (replace with Slack / UI / CLI)
  const approved = await fakeHumanApproval({ autoApprove, timeout });

  if (!approved) {
    return { approved: false, reason: "Human rejected action" };
  }

  return { approved: true, reason: "Human approved action" };
}

/**
 * Fake human approval (for testing)
 * Replace with Slack buttons, dashboard UI, or CLI prompt
 */
async function fakeHumanApproval({ autoApprove = false, timeout = 60000 }) {
  if (autoApprove) {
    return true;
  }

  return new Promise(resolve => {
    setTimeout(() => resolve(true), 2000);
  });
}

/**
 * Real Slack approval (pseudo-code for production)
 */
async function slackApproval(actions) {
  // In production, send Slack interactive message with buttons
  // const response = await sendSlack({
  //   text: "🚨 High Risk Detected",
  //   actions: [
  //     { type: "button", text: "Approve", value: "yes" },
  //     { type: "button", text: "Reject", value: "no" }
  //   ]
  // });
  // return response === "yes";
  
  console.log("📡 Slack approval request sent (pseudo-code)");
  return true;
}

/**
 * CLI approval (for local development)
 */
async function cliApproval(actions) {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question(`Approve actions ${actions.join(", ")}? (y/n): `, resolve);
  });

  rl.close();
  return answer.toLowerCase() === "y";
}

module.exports = {
  requireApproval,
  fakeHumanApproval,
  slackApproval,
  cliApproval
};
