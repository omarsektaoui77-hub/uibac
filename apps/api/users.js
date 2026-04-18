// ZeroLeak SOC - Users Module with RBAC
// In production, replace with database

const users = [
  { username: "admin", password: "admin", role: "ADMIN" },
  { username: "analyst", password: "analyst", role: "ANALYST" },
  { username: "viewer", password: "viewer", role: "VIEWER" }
];

module.exports = { users };
