const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

exports.getStudents = (req, res) => {
    db.query('SELECT * FROM students', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// when student signs up
exports.signupStudent = (req, res) => {
    const { username, password, name, mail, loginMethod, image } = req.body;
    /*if (!username){ //|| !image) {
        return res.status(400).send('Username and image are required.');
    }*/
    const sql = 'INSERT INTO students (username, password, name, mail, loginMethod, image) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [username, password, name, mail, loginMethod, image], (err, result) => {
        if (err) return res.status(500).send(err);

        const token = jwt.sign({ userId: result.insertId, username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ userId: result.insertId, role: 'student', username, password, name, mail, loginMethod, image, token });
    });
};

// jwt token for authentication when logs in
exports.loginStudent = (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM students WHERE username = ? AND password = ?';

    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(401).send('Invalid credentials');

        const student = results[0];
        const token = jwt.sign({ userId: student.studentId, role: 'student' }, JWT_SECRET, { expiresIn: '3h' });

        res.json({ token });
    });
};