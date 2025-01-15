const db = require('../config/db');
const axios = require('axios');
const { generateTokens } = require('../jwt/auth');
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
    const { mail, password, studentFCM } = req.body;
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
        if (studentFCM) {
            const updateResult = await updateStudentFCM(student.studentid, studentFCM);
            if (!updateResult.success) {
                return res.status(401).json({ message: updateResult.message });
            }
        }
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            // secure: true, // ensure the cookie only sent over HTTPS
            sameSite: 'Strict',
            maxAge: 6 * 30 * 24 * 60 * 60 * 1000
        });

        res.json({ userId: student.studentid, accessToken });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

const signupWithKakao = async (username, loginMethod, kakaoId) => {
    const sql = 'INSERT INTO students (username, loginMethod, kakaoId, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())';
    try {
        const [result] = await db.query(sql, [username, loginMethod, kakaoId]);

        const { accessToken, refreshToken } = generateTokens(result.insertId, 'student');

        return { userId: result.insertId, accessToken, refreshToken };
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

const signupWithGoogle = async (username, mail, loginMethod) => {
    const sql = 'INSERT INTO students (username, mail, loginMethod, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())';
    try {
        const [result] = await db.query(sql, [username, mail, loginMethod]);

        const { accessToken, refreshToken } = generateTokens(result.insertId, 'student');

        return { userId: result.insertId, accessToken, refreshToken };
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

exports.loginStudentWithKakao = async (req, res) => {
    const { kakaoId, username, studentFCM } = req.body;

    try {
        const sqlCheck = 'SELECT * FROM students WHERE kakaoId = ?';
        const [existingStudent] = await db.query(sqlCheck, [kakaoId]);

        if (existingStudent.length > 0) {
            const student = existingStudent[0];
            const { accessToken, refreshToken } = generateTokens(student.studentid, 'student');
            if (studentFCM) {
                const updateResult = await updateStudentFCM(student.studentid, studentFCM);
                if (!updateResult.success) {
                    return res.status(401).json({ message: updateResult.message });
                }
            }
            res.cookie('refreshToken', refreshToken,
                {
                    httpOnly: true,
                    //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                    sameSite: 'Strict', // prevent CSRF
                    maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
                });
            return res.json({ userId: student.studentId, accessToken });
        } else {
            const studentData = await signupWithKakao(username, 1, kakaoId);

            res.cookie('refreshToken', studentData.refreshToken, {
                httpOnly: true,
                //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                sameSite: 'Strict',
                maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
            });

            return res.json({ userId: studentData.userId, accessToken: studentData.accessToken });
        }
    } catch (err) {
        console.error('Kakao login error:', err);
        if (err.response && err.response.status === 403) {
            return res.status(403).json({ message: 'Invalid Kakao access token' });
        }
        return res.status(500).json({ message: 'Failed to log in with Kakao', error: err.message });
    }
};

exports.loginStudentWithGoogle = async (req, res) => {
    const { username, mail, studentFCM } = req.body;
    console.log("username: ", username);

    try {
        const sqlCheck = 'SELECT * FROM students WHERE mail = ?';
        const [existingStudent] = await db.query(sqlCheck, [mail]);

        if (existingStudent.length > 0) {
            const student = existingStudent[0];
            const { accessToken, refreshToken } = generateTokens(student.studentid, 'student');
            if (studentFCM) {
                const updateResult = await updateStudentFCM(student.studentid, studentFCM);
                if (!updateResult.success) {
                    return res.status(401).json({ message: updateResult.message });
                }
            }
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                sameSite: 'Strict',
                maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
            });

            return res.json({ userId: student.studentid, accessToken });
        } else { // if user doesn't exist, it needs sign up
            const studentData = await signupWithGoogle(username, mail, 2);

            res.cookie('refreshToken', studentData.refreshToken, {
                httpOnly: true,
                //secure: process.env.NODE_ENV === 'production', // use HTTPS in production
                sameSite: 'Strict',
                maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
            });

            return res.json({ userId: studentData.userId, accessToken: studentData.accessToken });
        }
    } catch (err) {
        console.error('Google login error:', err);

        if (err.response && err.response.status === 401) {
            return res.status(401).json({ message: 'Invalid Google access token' });
        }

        return res.status(500).json({ message: 'Failed to log in with Google', error: err.message });
    }
};

const updateStudentFCM = async (studentId, studentFCM) => {
    const sql = `UPDATE classes SET studentFCM = ? WHERE studentid = ?`;

    try {
        const [result] = await db.query(sql, [studentFCM, studentId]);

        return { success: true, message: "Student's FCM updated successfully" };
    } catch (err) {
        console.error('Database query error:', err);
        return { success: false, message: "Error updating FCM", error: err };
    }
};

exports.signoutStudent = async (req, res) => {
    const studentId = req.userId;

    try {
        // delete user in teachers table
        const deleteSql = `DELETE FROM students WHERE studentid = ?`;
        await db.query(deleteSql, [studentId]);
        // delete on cascade for other related data in database

        res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict' });
        res.setHeader('Authorization', '');
        res.status(200).json({ message: "User signed out successfully" });
    } catch (error) {
        console.error("Error signing out student:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

exports.getName = async (req, res) => {
    const studentId = req.userId;

    try{
        const [results] = await db.query('SELECT username FROM students WHERE studentid = ?', [studentId]);
        res.json(results);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};