const db = require('../config/db');

exports.getClassesid = async (req, res) => {
    const teacherId = req.userId;

    try {
        const [results] = await db.query('SELECT C.classid FROM classes AS C, teachers AS T WHERE C.teacherid = T.teacherid', [teacherId]);
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// all class information for a teacher's total calendar in monthly
exports.getAllClassTeacher = async (req, res) => {
    const teacherId = req.userId;
    const { year, month } = req.body;

    console.log('Teacher ID from JWT:', teacherId);
    console.log('Fetching data for Year:', year, 'Month:', month);

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
            C.teacherid = ? AND 
            YEAR(D.date) = ? AND 
            MONTH(D.date) = ? 
        ORDER BY 
            D.date ASC`;

    try {
        const [results] = await db.query(sql, [teacherId, year, month]);
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// all class information for a student's total calendar
exports.getAllClassStudent = async (req, res) => {
    const studentId = req.userId;
    const { year, month } = req.body;

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
            C.studentid = ? AND 
            YEAR(D.date) = ? AND 
            MONTH(D.date) = ? 
        ORDER BY 
            D.date ASC`;

    try {
        const [results] = await db.query(sql, [studentId, year, month]);
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// for each date clicked in teacher's total calendar
exports.getClassesByDateTeacher = async (req, res) => {
    const { date } = req.body;
    const teacherId = req.userId;

    console.log("Received date:", date);

    const sql = `
        SELECT 
            C.classid, 
            C.classname, 
            C.themecolor,
            CASE 
                WHEN D.feedback_written = 1 THEN '피드백 완료'
                ELSE '피드백 미완료'
            END AS feedbackStatus
        FROM 
            classes AS C
        JOIN 
            teachers AS T ON C.teacherid = T.teacherid
        JOIN 
            dates AS D ON C.classid = D.classid
        WHERE 
            DATE(D.date) = ? AND C.teacherid = ?;
        `;

    try {
        const [results] = await db.query(sql, [date, teacherId]);
        console.log("Query result:", results);

        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};


// for each date clicked in student's total calendar 
exports.getClassesByDateStudent = async (req, res) => {
    const { date } = req.body;
    const studentId = req.userId;

    const sql = `
        SELECT C.classid, C.classname, C.themecolor,
               CASE 
                   WHEN D.feedback_written IS 1 THEN '피드백 완료'
                   ELSE '피드백 미완료'
               END AS feedbackStatus
        FROM classes AS C
        JOIN students AS T ON C.studentid = T.studentid
        JOIN dates AS D ON C.classid = D.classid
        WHERE 
            DATE(D.date) = ? AND C.studentid = ?;`;

    try {
        const [results] = await db.query(sql, [date, studentId]);
        console.log("Query result:", results);
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};