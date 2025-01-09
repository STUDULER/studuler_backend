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
    const { username, password, mail, loginMethod, imageNum } = req.body;

    console.log('Received data:', req.body);

    const checkSql = 'SELECT COUNT(*) AS count FROM students WHERE mail = ?';
    const sql = 'INSERT INTO students (username, password, mail, loginMethod, imageNum, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())';
    try {
        const [checkResult] = await db.query(checkSql, [mail]);
        const mailExists = checkResult[0].count > 0;
        if (mailExists) { // user already exists
            return res.status(401).json({ message: '이미 존재하는 계정입니다.' });
        }
        
        const [result] = await db.query(sql, [username, password, mail, loginMethod, imageNum]);

        const { accessToken, refreshToken } = generateTokens(result.insertId, 'student');
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
            sameSite: 'Strict', // prevent CSRF
            maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
        });
        res.status(201).json({ userId: result.insertId, role: 'student', username, password, mail, loginMethod, imageNum, accessToken });
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
        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: '잘못된 메일 또는 비밀번호 입니다. 다시 입력해주세요.',
            });
        }

        const student = results[0];
        const { accessToken, refreshToken } = generateTokens(student.studentid, 'student');
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

const signupWithGoogle = async (username, mail, loginMethod, googleId) => {
    const sql = 'INSERT INTO students (username, mail, loginMethod, googleId, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())';
    try {
        const [result] = await db.query(sql, [username, mail, loginMethod, googleId]);

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

        if (existingStudent.length > 0) {
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

exports.loginStudentWithGoogle = async (req, res) => {
    const { googleIdToken } = req.body;

    if (!googleIdToken) {
        return res.status(400).json({ message: 'Google access token is required' });
    }

    try {
        // verify the Google access token and get user info
        const ticket = await googleClient.verifyIdToken({
            idToken: googleIdToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const googlePayload = ticket.getPayload();
        const googleId = googlePayload.sub; // google user ID
        const username = googlePayload.name || 'Unknown';
        const mail = googlePayload.email || null;

        const sqlCheck = 'SELECT * FROM students WHERE googleId = ?';
        const [existingStudent] = await db.query(sqlCheck, [googleId]);

        if (existingStudent.length > 0) {
            const student = existingStudent[0];
            const { accessToken, refreshToken } = generateTokens(student.studentid, 'student');

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                sameSite: 'Strict',
                maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
            });

            return res.json({ accessToken });
        } else { // if user doesn't exist, it needs sign up
            const studentData = await signupWithGoogle(username, mail, 3, googleId);

            res.cookie('refreshToken', studentData.refreshToken, {
                httpOnly: true,
                //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                sameSite: 'Strict',
                maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
            });

            return res.json({ accessToken });
        }
    } catch (err) {
        console.error('Google login error:', err);

        if (err.response && err.response.status === 401) {
            return res.status(401).json({ message: 'Invalid Google access token' });
        }

        return res.status(500).json({ message: 'Failed to log in with Google', error: err.message });
    }
};