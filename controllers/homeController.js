const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.getClasses = (req, res) => {
    db.query('SELECT * FROM classes', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// class created by teacher
exports.createClassTeacher = (req, res) => {
    const { classname, period, time, hourlyrate, prepay, themecolor } = req.body;
    const userId = req.userId;

    console.log('Received data:', req.body);
    console.log('Authenticated teacher ID:', userId);

    const classcode = uuidv4().split('-')[0];

    // day 넣어야함!!!
    const sql = 'INSERT INTO classes (classname, period, time, hourlyrate, prepay, themecolor, teacherid, classcode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
    db.query(sql, [classname, period, time, hourlyrate, prepay, themecolor, userId, classcode], (err, result) => {
	    if (err) {
            console.error('Database query error:', err); // Log any error from the database query
            return res.status(500).send(err);
        }

        res.status(201).json({ message: 'Class created successfully', classId: result.insertId, classname, classcode });
    });
};

exports.joinClass = (req, res) => { // for student
    const { classcode } = req.body;
    const userId = req.userId;

    console.log('Received data:', req.body);
    console.log('Authenticated student ID:', userId);

    const sql = 'UPDATE classes SET studentid = ? WHERE classcode = ? AND studentid IS NULL';

    db.query(sql, [userId, classcode], (err, result) => {
        if (err) {
            console.error('Database query error:', err); // Log any error from the database query
            return res.status(500).send(err);
        }

        if (result.affectedRows > 0) {
            // Successfully updated the class with studentId
            res.status(200).json({ message: 'Successfully joined the class.' });
        } else {
            // No rows affected, either classcode is invalid or student already joined
            res.status(400).json({ message: 'Could not join the class. Make sure the class exists and has no student yet.' });
        }
    });
}

// each class information for teacher's home screen
exports.getEachClassTeacher = (req, res) => { 
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    // 학생이름, 요일, 정산방법, 수업횟수, 다음정산일, 수업코드, 제목, 진행수업횟수, 테마색상
    const sql = `
        SELECT 
            S.username, 
            C.classid, 
            C.classcode, 
            C.classname,
            C.day, 
            C.time, 
            C.period, 
            C.dateofpayment, 
            C.hourlyrate, 
            C.prepay, 
            C.themecolor 
        FROM 
            classes AS C
        JOIN 
            teachers AS T ON T.teacherid = C.teacherid
        LEFT JOIN
            students AS S ON C.studentid = S.studentid AND C.studentid IS NOT NULL
        WHERE 
            T.teacherid = ?`;
            
    db.query(sql, [teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// each class information for student's home screen
exports.getEachClassStudent = (req, res) => {
    const studentId = req.studentId;

    // 학생이름, 요일, 정산방법, 수업횟수, 다음정산일, 수업코드, 제목, 진행수업횟수, 테마색상
    const sql = `
        SELECT 
            T.username, 
            C.classid, 
            C.classcode, 
            C.day, 
            C.period, 
            C.dateofpayment, 
            C.hourlyrate, 
            C.prepay, 
            C.themecolor 
        FROM 
            classes AS C
        JOIN 
            students AS S ON S.studentid = C.studentid
        JOIN 
            teachers AS T ON C.teacherid = T.teacherid
        WHERE 
            T.studentid = ?`;
            
    db.query(sql, [studentId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// list of dates with unwritten feedback for teacher
exports.getUnwrittenFeedbackDates = (req, res) => {
    const { classId } = req.query;
    const teacherId = req.teacherId; // Authenticated teacherId from JWT

    const sql = `
        SELECT 
            D.dateid, 
            D.classid, 
            D.date
        FROM 
            dates AS D
        LEFT JOIN 
            feedback AS F ON D.dateid = F.dateid
        WHERE 
            D.classId = ? AND C.teacherid = ? 
            AND F.dateid IS NULL AND D.feedback_written = 0`;

    db.query(sql, [teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};
