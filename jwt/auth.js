const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(403).send('Token required');

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send('Invalid token');

        req.userId = decoded.userId;  // attach teacherId to request
        req.role = decoded.role; // role of the user
        next();
    });
};

module.exports = authenticateJWT;
