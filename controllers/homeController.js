const db = require('../config/db');

exports.getClasses = (req, res) => {
    db.query('SELECT * FROM classes', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// each class information for teacher's home screen
exports.getEachClassTeacher = (req, res) => {
    const teacherId = req.teacherId;

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
        JOIN 
            students AS S ON C.studentid = S.studentid
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
    const teacherId = req.teacherId; // Authenticated teacherId from JWT

    const sql = `
        SELECT 
            D.dateid, 
            D.classid, 
            D.date
        FROM 
            dates AS D
        JOIN 
            classes AS C ON D.classid = C.classid
        LEFT JOIN 
            feedback AS F ON D.dateid = F.dateid
        WHERE 
            C.teacherid = ? 
            AND F.dateid IS NULL`;

    db.query(sql, [teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};
