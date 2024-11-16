const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateJWT = (req, res, next) => { // verify the token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(403).send('Token required');

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('JWT verification error:', err.message);
            return res.status(403).send('Invalid token');
        }

        // JSON data
        req.userId = decoded.userId || null;  // attach teacherId to request
        req.role = decoded.role || null; // role of the user

        next();
    });
};

module.exports = authenticateJWT;
