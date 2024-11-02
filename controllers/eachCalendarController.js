const db = require('../config/db');

// all class information for a teacher's total calendar
exports.getEachCalendarTeacher = (req, res) => {
    const { classId } = req.query;
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
            C.classid = ? AND C.teacherid = ?`;
            
    db.query(sql, [classId, teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// all class information for a student's total calendar
exports.getEachCalendarStudent = (req, res) => {
    const { classId } = req.query;
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
            C.classid = ? AND C.studentid = ?`;
            
    db.query(sql, [classId, studentId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// for each date clicked in teacher's total calendar
exports.getFeedbackByDateTeacher = (req, res) => {
    const { date } = req.query;
    const { classId } = req.query;
    const teacherId = req.userId;

    const sql = `
        SELECT C.classid, C.classname, C.time, C.themecolor, 
               F.feedbackid, F.workdone, F.attitude, F.homework, 
               F.memo, F.rate, 
               F.feedback_written,
               CASE 
                   WHEN F.feedback_written = 1 THEN JSON_OBJECT(
                       'feedbackid', F.feedbackid,
                       'workdone', F.workdone,
                       'attitude', F.attitude,
                       'homework', F.homework,
                       'memo', F.memo,
                       'rate', F.rate
                   )
                       
                   ELSE NULL
               END AS feedbackDetails
        FROM classes AS C
        JOIN dates AS D ON C.classid = D.classid
        JOIN feedback AS F ON F.dateid = D.dateid AND F.classid = C.classid
        WHERE D.date = ? AND D.classid = ? AND C.teacherid = ?;`;

    db.query(sql, [date, classId, teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results); 
    });
};


// for each date clicked in student's total calendar 
exports.getClassesByDateStudent = (req, res) => {
    const { date } = req.query;
    const { classId } = req.query;
    const studentId = req.userId;

    const sql = `
        SELECT C.classid, C.classname, C.time, C.themecolor, 
               F.feedbackid, F.workdone, F.attitude, F.homework, 
               F.memo, F.rate, 
               F.feedback_written,
               CASE 
                   WHEN F.feedback_written = 1 THEN JSON_OBJECT(
                       'feedbackid', F.feedbackid,
                       'workdone', F.workdone,
                       'attitude', F.attitude,
                       'homework', F.homework,
                       'memo', F.memo,
                       'rate', F.rate
                   )
                   ELSE NULL
               END AS feedbackDetails
        FROM classes AS C
        JOIN dates AS D ON C.classid = D.classid
        JOIN feedback AS F ON F.dateid = D.dateid AND F.classid = C.classid
        WHERE D.date = ? AND D.classid = ? AND C.studentid = ?;`;

    db.query(sql, [date, classId, studentId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results); 
    });
};