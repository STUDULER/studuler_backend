const db = require('../config/db');

// all class information for a teacher's total calendar
exports.getAllClassTeacher = (req, res) => {
    const teacherId = req.userId;

    // 학생이름, 요일, 정산방법, 수업횟수, 다음정산일, 수업코드, 제목, 진행수업횟수, 테마색상
    const sql = `
        SELECT 
            D.dateid, 
            D.date, 
            D.time, 
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
            dates AS D ON D.classid = C.classid
        WHERE 
            C.teacherid = ?`;
            
    db.query(sql, [teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// all class information for a student's total calendar
exports.getAllClassStudent = (req, res) => {
    const studentId = req.userId;

    // 학생이름, 요일, 정산방법, 수업횟수, 다음정산일, 수업코드, 제목, 진행수업횟수, 테마색상
    const sql = `
        SELECT 
            D.dateid, 
            D.date, 
            D.time, 
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
            dates AS D ON D.classid = C.classid
        WHERE 
            C.studentid = ?`;
            
    db.query(sql, [studentId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// for each date clicked in teacher's total calendar
exports.getClassesByDateTeacher = (req, res) => {
    const { date } = req.query;
    const teacherId = req.userId;

    const sql = `
        SELECT C.classid, C.classname, C.time, C.themecolor,
               CASE 
                   WHEN F.feedbackid IS NOT NULL THEN '피드백 완료'
                   ELSE '피드백 미완료'
               END AS feedbackStatus
        FROM classes AS C
        JOIN teachers AS T ON C.teacherid = T.teacherid
        JOIN dates AS D ON C.classid = D.classid
        LEFT JOIN feedback AS F ON F.dateid = D.dateid AND F.classid = C.classid
        WHERE D.date = ? AND C.teacherid = ?;`;

    db.query(sql, [date, teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results); 
    });
};


// for each date clicked in student's total calendar 
exports.getClassesByDateStudent = (req, res) => {
    const { date } = req.query;
    const studentId = req.userId;

    const sql = `
        SELECT C.classid, C.classname, C.time, C.themecolor,
               CASE 
                   WHEN F.feedbackid IS NOT NULL THEN '피드백 완료'
                   ELSE '피드백 미완료'
               END AS feedbackStatus
        FROM classes AS C
        JOIN students AS T ON C.studentid = T.studentid
        JOIN dates AS D ON C.classid = D.classid
        LEFT JOIN feedback AS F ON F.dateid = D.dateid AND F.classid = C.classid
        WHERE D.date = ? AND C.studentid = ?;`;

    db.query(sql, [date, studentId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results); 
    });
};