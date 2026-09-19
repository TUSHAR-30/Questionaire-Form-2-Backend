const jwt = require('jsonwebtoken');
const User = require('../Models/user');

// Best-effort identification of whoever is making a public request. Returns the lowercase
// emails we can attribute to them: the logged-in account (`token` cookie) and/or the
// Google respondent identity (`formToken` cookie). Never throws; bad/missing tokens = anonymous.
async function getRequesterEmails(req) {
  const emails = new Set();

  const authToken = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (authToken) {
    try {
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('email');
      if (user?.email) emails.add(user.email.toLowerCase());
    } catch (err) {
      // invalid/expired token: treat as anonymous
    }
  }

  const formToken = req.cookies?.formToken;
  if (formToken) {
    try {
      const decoded = jwt.verify(formToken, process.env.JWT_SECRET);
      if (decoded?.email) emails.add(String(decoded.email).toLowerCase());
    } catch (err) {
      // invalid/expired token: ignore
    }
  }

  return [...emails];
}

module.exports = { getRequesterEmails };
