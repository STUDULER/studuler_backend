const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

exports.getStudents = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM students');
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// when student signs up
exports.signupStudent = async (req, res) => {
    const { username, password, mail, loginMethod, imageNum, kakaoId } = req.body;

    console.log('Received data:', req.body);

    const sql = 'INSERT INTO students (username, password, mail, loginMethod, imageNum, kakaoId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())';
    try {
        const [result] = await db.query(sql, [username, password, mail, loginMethod, imageNum, kakaoId]);

        const { accessToken, refreshToken } = generateTokens(result.insertId, 'student');
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
            sameSite: 'Strict', // prevent CSRF
            maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
        });
        res.status(201).json({ userId: result.insertId, role: 'student', username, password, mail, loginMethod, imageNum, kakaoId, accessToken });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// jwt token for authentication when logs in
exports.loginStudent = async (req, res) => {
    const { mail, password } = req.body;
    const sql = 'SELECT * FROM students WHERE mail = ? AND password = ?';

    try {
        const [results] = await db.query(sql, [mail, password]);
        if (results.length === 0) return res.status(401).send('Invalid credentials');

        const student = results[0];
        const { accessToken, refreshToken } = generateTokens(student.studentid, 'student');
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            // secure: true, // ensure the cookie only sent over HTTPS
            sameSite: 'Strict',
            maxAge: 6 * 30 * 24 * 60 * 60 * 1000
        });

        res.json({ accessToken });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

const signupWithKakao = async (username, mail, loginMethod, kakaoId) => {
    const sql = 'INSERT INTO students (username, mail, loginMethod, kakaoId, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())';
    try {
        const [result] = await db.query(sql, [username, mail, loginMethod, kakaoId]);

        const { accessToken, refreshToken } = generateTokens(result.insertId, 'student');

        return { userId: result.insertId, accessToken, refreshToken };
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

exports.loginStudentWithKakao = async (req, res) => {
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

        const sqlCheck = 'SELECT * FROM students WHERE kakaoId = ?';
        const [existingStudent] = await db.query(sqlCheck, [kakaoId]);

        if (existingTeacher.length > 0) {
            const student = existingStudent[0];
            const { accessToken, refreshToken } = generateTokens(student.studentid, 'student');
            res.cookie('refreshToken', refreshToken,
                {
                    httpOnly: true,
                    //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                    sameSite: 'Strict', // prevent CSRF
                    maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
                });
            return res.json({ accessToken });
        } else {
            const studentData = await signupWithKakao(username, mail, 2, kakaoId);

            res.cookie('refreshToken', studentData.refreshToken, {
                httpOnly: true,
                //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                sameSite: 'Strict',
                maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
            });

            return res.json({ accessToken });
        }
    } catch (err) {
        console.error('Kakao login error:', err);
        if (err.response && err.response.status === 401) {
            return res.status(401).json({ message: 'Invalid Kakao access token' });
        }
        return res.status(500).json({ message: 'Failed to log in with Kakao', error: err.message });
    }
}