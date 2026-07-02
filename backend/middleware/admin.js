function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required."
    });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Super Admin privileges required."
    });
  }
  next();
}

module.exports = { requireAdmin, requireSuperAdmin };