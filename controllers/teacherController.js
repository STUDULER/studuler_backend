const jwt = require('jsonwebtoken');
const db = require('../config/db');
const axios = require('axios');
//const { OAuth2Client } = require('google-auth-library');
//const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { generateTokens } = require('../jwt/auth');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

exports.getTeachers = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM teachers');
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// when teacher signs up
exports.signupTeacher = async (req, res) => {
    const { username, password, account, bank, name, mail, loginMethod, imageNum, kakaoId } = req.body;
    console.log('Received data:', req.body);

    const checkSql = 'SELECT COUNT(*) AS count FROM teachers WHERE mail = ?';
    const sql = 'INSERT INTO teachers (username, password, account, bank, name, mail, loginMethod, imageNum, kakaoId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
    try {
        const [checkResult] = await db.query(checkSql, [mail]);
        const mailExists = checkResult[0].count > 0;
        if (mailExists) { // user already exists
            return res.status(401).json({ message: '이미 존재하는 계정입니다.' });
        }

        const [result] = await db.query(sql, [username, password, account, bank, name, mail, loginMethod, imageNum, kakaoId]);

        const { accessToken, refreshToken } = generateTokens(result.insertId, 'teacher');
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
            sameSite: 'Strict', // prevent CSRF
            maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
        });
        res.status(201).json({ userId: result.insertId, role: 'teacher', username, password, account, bank, name, mail, loginMethod, imageNum, createdAt: new Date(), updatedAt: new Date(), accessToken });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// jwt token for authentication when logs in
exports.loginTeacher = async (req, res) => {
    const { mail, password } = req.body;
    const sql = 'SELECT * FROM teachers WHERE mail = ? AND password = ?';

    try {
        const [results] = await db.query(sql, [mail, password]);
        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: '잘못된 메일 또는 비밀번호 입니다. 다시 입력해주세요.',
            });
        }

        const teacher = results[0];
        const { accessToken, refreshToken } = generateTokens(teacher.teacherid, 'teacher');
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            // secure: true, // ensure the cookie only sent over HTTPS
            sameSite: 'Strict',
            maxAge: 6 * 30 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true, accessToken });
    }
    catch (err) {
        console.error('Database query error:', err);
        return res.status(500).send(err);
    }
};

exports.loginTeacherWithKakao = async (req, res) => {
    const { kakaoAccessToken } = req.body;

    if (!kakaoAccessToken) {
        return res.status(400).json({ message: 'Kakao access token is required' });
    }

    try {
        const kakaoResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: {
                Authorization: `Bearer ${kakaoAccessToken}`,
            },
        });

        const kakaoProfile = kakaoResponse.data;
        const kakaoId = kakaoProfile.id;
        const username = kakaoProfile.properties?.nickname || 'Unknown';
        const mail = kakaoProfile.kakao_account?.email || null;

        const sqlCheck = 'SELECT * FROM teachers WHERE kakaoId = ?';
        const [existingTeacher] = await db.query(sqlCheck, [kakaoId]);

        if (existingTeacher.length > 0) {
            const teacher = existingTeacher[0];
            const { accessToken, refreshToken } = generateTokens(teacher.teacherid, 'teacher');
            res.cookie('refreshToken', refreshToken,
                {
                    httpOnly: true,
                    //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                    sameSite: 'Strict', // prevent CSRF
                    maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
                });
            return res.json({ accessToken });
        } else {
            return res.status(404).json({ isExist: false, kakaoId: kakaoId, username: username, mail: mail }); // if false, it needs sign up
        }
    } catch (err) {
        console.error('Kakao login error:', err);
        if (err.response && err.response.status === 401) {
            return res.status(401).json({ message: 'Invalid Kakao access token' });
        }
        return res.status(500).json({ message: 'Failed to log in with Kakao', error: err.message });
    }
}

exports.loginTeacherWithGoogle = async (req, res) => {
    const { mail } = req.body;

    /*if (!googleIdToken) {
        return res.status(400).json({ message: 'Google access token is required' });
    }*/

    try {
        // verify the Google access token and get user info
        /*const ticket = await googleClient.verifyIdToken({
            idToken: googleIdToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const googlePayload = ticket.getPayload();
        const googleId = googlePayload.sub; // google user ID
        const username = googlePayload.name || 'Unknown';
        const mail = googlePayload.email || null;
        */
        const sqlCheck = 'SELECT * FROM teachers WHERE mail = ?';
        const [existingTeacher] = await db.query(sqlCheck, [mail]);

        if (existingTeacher.length > 0) {
            const teacher = existingTeacher[0];
            const { accessToken, refreshToken } = generateTokens(teacher.teacherid, 'teacher');

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                sameSite: 'Strict',
                maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
            });

            return res.json({ accessToken });
        } else { // if user doesn't exist, it needs sign up
            return res.status(404).json({
                isExist: false
            });
        }
    } catch (err) {
        console.error('Google login error:', err);

        if (err.response && err.response.status === 401) {
            return res.status(401).json({ message: 'Invalid Google access token' });
        }

        return res.status(500).json({ message: 'Failed to log in with Google', error: err.message });
    }
};