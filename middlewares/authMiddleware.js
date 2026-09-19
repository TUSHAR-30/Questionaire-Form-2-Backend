const jwt = require('jsonwebtoken');
const User = require('../Models/user');

exports.authenticate = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    // If the route is /login or /register, allow access even without a token
    if ((req.originalUrl === '/api/login' || req.originalUrl === '/api/register') && !token) {
        return next();  // Proceed to the next middleware or route handler
    }

    // If there's no token and it's not the login/register route, deny access
    if (!token) {
        return res.status(401).json({ message: 'You are not logged in. Please login first.' });
    }

    // If there is a token, verify it
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ message: 'User not found. Unauthorized.' });
        }

        // If the user is already logged in, deny access to login/register routes
        if (req.originalUrl === '/api/login' || req.originalUrl === '/api/register') {
            return res.status(403).json({ message: 'You are already logged in.' });
        }

        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};
