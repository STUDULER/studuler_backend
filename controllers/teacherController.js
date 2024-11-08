const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

exports.getTeachers = (req, res) => {
    db.query('SELECT * FROM teachers', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// when teacher signs up
exports.signupTeacher = (req, res) => {
    const { username, password, account, bank } = req.body;
    const image = req.file ? req.file.buffer : null;
    /*if (!username ){//|| !image) {
        return res.status(400).send('Username and image are required.');
    }*/
    const sql = 'INSERT INTO teachers (username, password, account, bank, image) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [username, password, account, bank, image], (err, result) => {
        if (err) return res.status(500).send(err);

        const token = jwt.sign({ userId: result.insertId, username }, process.env.JWT_SECRET, { expiresIn: '3h' });
        res.status(201).json({ userId: result.insertId, role: 'teacher', username, password, account, bank, token });
    });
};

// jwt token for authentication when logs in
exports.loginTeacher = (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM teachers WHERE username = ? AND password = ?';

    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(401).send('Invalid credentials');

        const teacher = results[0];
        const token = jwt.sign({ userId: teacher.teacherId, role: 'teacher' }, JWT_SECRET, { expiresIn: '3h' });

        res.json({ token });
    });
};