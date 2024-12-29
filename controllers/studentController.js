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
    const { username, password, name, mail, loginMethod, imageNum } = req.body;

    console.log('Received data:', req.body);

    const sql = 'INSERT INTO students (username, password, name, mail, loginMethod, imageNum, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())';
    try {
        const [result] = await db.query(sql, [username, password, name, mail, loginMethod, imageNum]);

        const token = jwt.sign({ userId: result.insertId, role: 'student' }, JWT_SECRET, { expiresIn: '8h' });
        res.status(201).json({ userId: result.insertId, role: 'student', username, password, name, mail, loginMethod, imageNum, token });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// jwt token for authentication when logs in
exports.loginStudent = async (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM students WHERE username = ? AND password = ?';

    try {
        const [results] = await db.query(sql, [username, password]);
        if (results.length === 0) return res.status(401).send('Invalid credentials');

        const student = results[0];
        const token = jwt.sign({ userId: student.studentid, role: 'student' }, JWT_SECRET, { expiresIn: '8h' });

        res.json({ token });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};
