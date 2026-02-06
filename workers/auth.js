function isAuthenticated(req, res, next) {
  if (req.session && req.session.isAuthenticated) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

function isAdmin(req, res, next) {
  const u = req.session && req.session.user;
  if (u && u.role === 'admin') return next();
  return res.redirect('/cms'); // of toon een flash indien gewenst
}

module.exports = { isAuthenticated, isAdmin };
