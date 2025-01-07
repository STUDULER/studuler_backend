const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

exports.getTeachers = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM teachers');
        res.json(results);
    }
    catch (err){
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// when teacher signs up
exports.signupTeacher = async (req, res) => {
    const { username, password, account, bank, name, mail, loginMethod, imageNum } = req.body;
    console.log('Received data:', req.body);

    const sql = 'INSERT INTO teachers (username, password, account, bank, name, mail, loginMethod, imageNum, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
    try{
        const [result] =  await db.query(sql, [username, password, account, bank, name, mail, loginMethod, imageNum]);

        const token = jwt.sign({ userId: result.insertId, role: 'teacher' }, JWT_SECRET, { expiresIn: '8h' });
        res.status(201).json({ userId: result.insertId, role: 'teacher', username, password, account, bank, name, mail, loginMethod, imageNum, createdAt: new Date(), updatedAt: new Date(), token });
    }
    catch (err){
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// jwt token for authentication when logs in
exports.loginTeacher = async (req, res) => {
    const { mail, password } = req.body;
    const sql = 'SELECT * FROM teachers WHERE mail = ? AND password = ?';

    try{
        const [results] = await db.query(sql, [mail, password]);
        if (results.length === 0) return res.status(401).send('Invalid credentials');

        const teacher = results[0];
        const token = jwt.sign({ userId: teacher.teacherid, role: 'teacher' }, JWT_SECRET, { expiresIn: '8h' });

        res.json({ token });
    }
    catch (err){
        console.error('Database query error:', err);
        return res.status(500).send(err);
    }
};
