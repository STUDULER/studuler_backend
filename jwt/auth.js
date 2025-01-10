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

    if (!accessToken) {
        return res.status(403).send('Access token required');
    }

    jwt.verify(accessToken, JWT_SECRET, async (err, decoded) => {
        if (err && err.name === 'TokenExpiredError') { // if access token is expired, attempt to refresh it
            return res.status(403).send('Need refresh token');
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
                { expiresIn: '1m' } // new access token
            );

            const newRefreshToken = jwt.sign(
                { userId: decoded.userId, role: decoded.role },
                JWT_REFRESH_SECRET,
                { expiresIn: '180d' } // New refresh token with 180 days expiry
            );
            resolve(newAccessToken, newRefreshToken);
        });
    });
};

const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.body;
    //const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(405).send('Refresh token required');
    }

    try {
        const { newAccessToken, newRefreshToken } = await autoRefreshAccessToken(refreshToken);

        // Send new access token and refresh token in response headers/cookies
        res.setHeader('Authorization', `Bearer ${newAccessToken}`);
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            sameSite: 'Strict',
            maxAge: 6 * 30 * 24 * 60 * 60 * 1000,  // 6 months
        });

        // Respond with success
        res.send({ success: true, access: newAccessToken, refresh: newRefreshToken });
    } catch (refreshErr) {
        console.error('Error refreshing token:', refreshErr);
        return res.status(403).send('Invalid or expired refresh token');
    }
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
