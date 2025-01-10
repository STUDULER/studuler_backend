const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const generateTokens = (userId, role) => {
    const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1m' });
    const refreshToken = jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: '180d' });

    return { accessToken, refreshToken };
};

const authenticateJWT = (req, res, next) => { // verify the token
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];
    const refreshToken = req.headers['authorization'];
    if (!refreshToken) {
        return res.status(403).json({ message: 'Refresh token required' });
    }

    if (!accessToken) {
        return res.status(403).send('Access token required');
    }

    jwt.verify(accessToken, JWT_SECRET, async (err, decoded) => {
        if (err && err.name === 'TokenExpiredError') { // if access token is expired, attempt to refresh it
            if (!refreshToken) {
                return res.status(405).send('Refresh token required');
            }

            try {
                const newAccessToken = await autoRefreshAccessToken(refreshToken);
                res.setHeader('Authorization', `Bearer ${newAccessToken}`);
                req.headers.authorization = `Bearer ${newAccessToken}`; // Update the request with the new token
                req.userId = decoded.userId;
                req.role = decoded.role;
                next();
            } catch (refreshErr) {
                console.error('Error refreshing token:', refreshErr);
                return res.status(403).send('Invalid or expired refresh token');
            }
        }
        else if (err) {
            // for other errors, deny access
            console.error('Access token verification error:', err.message);
            return res.status(403).send('Invalid access token');
        }
        else { // token is valid
            // JSON data
            req.userId = decoded.userId || null;  // attach teacherId to request
            req.role = decoded.role || null; // role of the user
            next();
        }
    });
};

const autoRefreshAccessToken = (refreshToken) => {
    return new Promise((resolve, reject) => {
        jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) return reject('Invalid refresh token');

            const newAccessToken = jwt.sign(
                { userId: decoded.userId, role: decoded.role },
                JWT_SECRET,
                { expiresIn: '10m' } // new access token
            );
            resolve(newAccessToken);
        });
    });
};

const refreshAccessToken = (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(405).send('Refresh token required');
    }

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
        if (err) {
            console.error('Refresh token verification error:', err.message);
            return res.status(403).send('Invalid refresh token');
        }

        const { userId, role } = decoded;
        const newAccessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '10m' });

        res.json({ accessToken: newAccessToken });
    });
};

const logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.send('Logged out successfully');
};

module.exports = {
    generateTokens,
    authenticateJWT,
    refreshAccessToken,
    logout,
};
