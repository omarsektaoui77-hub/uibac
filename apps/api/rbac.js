// ZeroLeak SOC - RBAC (Role-Based Access Control)

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  };
}

function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    next();
  };
}

module.exports = { requireRole, requireAnyRole };
