const jwt = require('jsonwebtoken');
const User = require('../Models/user');


exports.decodeToken = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'User not found. Unauthorized.' });
            }
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }
    }
    next(); // Proceed to the next middleware or route handler

}