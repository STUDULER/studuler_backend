const db = require('../config/db');

// all class information for a teacher's total calendar
exports.getEachCalendarTeacher = (req, res) => {
    const { classId } = req.body;
    const teacherId = req.userId;

    const sql = `
        SELECT 
            D.date, 
            C.classcode, 
            C.day, 
            C.period, 
            C.dateofpayment, 
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
    const { classId } = req.body;
    const studentId = req.userId;

    // 학생이름, 요일, 정산방법, 수업횟수, 다음정산일, 수업코드, 제목, 진행수업횟수, 테마색상
    const sql = `
        SELECT 
            D.date, 
            C.classcode, 
            C.day, 
            C.period, 
            C.dateofpayment, 
            SCI.themecolor 
        FROM 
            classes AS C
        JOIN
            student_classinfo AS SCI ON C.classid = SCI.classid
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
    const { date, classId } = req.body;
    const teacherId = req.userId;

    const sql = `
        SELECT C.classid,
               D.dateid, D.date, 
               F.feedbackid, F.workdone, F.attitude, F.homework, 
               F.memo, F.rate, 
               D.feedback_written,
               CASE 
                   WHEN D.feedback_written = 1 THEN JSON_OBJECT(
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
        LEFT JOIN feedback AS F ON F.dateid = D.dateid AND F.classid = C.classid
        WHERE D.date = ? AND D.classid = ? AND C.teacherid = ?;`;

    db.query(sql, [date, classId, teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results); 
    });
};


// for each date clicked in student's total calendar 
exports.getFeedbackByDateStudent = (req, res) => {
    const { date, classId } = req.body;
    const studentId = req.userId;

    const sql = `
        SELECT C.classid,
               D.dateid, D.date, 
               F.feedbackid, F.workdone, F.attitude, F.homework, 
               F.memo, F.rate, 
               D.feedback_written,
               CASE 
                   WHEN D.feedback_written = 1 THEN JSON_OBJECT(
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
        LEFT JOIN feedback AS F ON F.dateid = D.dateid AND F.classid = C.classid
        WHERE D.date = ? AND D.classid = ? AND C.teacherid = ?;`;

    db.query(sql, [date, classId, studentId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results); 
    });
};

exports.createFeedback = (req, res) => {
    const { classid, date, workdone, attitude, homework, memo, rate } = req.body;
    const teacherId = req.userId;

    // classid & date로 dateid 찾기
    const getDateIdSql = `
        SELECT dateid 
        FROM dates 
        WHERE classid = ? AND date = ? 
        LIMIT 1
    `;

    db.query(getDateIdSql, [classid, date], (err, dateResults) => {
        if (err) {
            console.error('Error fetching dateid:', err);
            return res.status(500).send(err);
        }

        if (dateResults.length === 0) {
            return res.status(404).json({ message: 'No matching date found for the provided classid and date.' });
        }

        const dateid = dateResults[0].dateid;

        // insert feedback
        const sql = 'INSERT INTO feedback (dateid, workdone, attitude, homework, memo, rate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())';
        db.query(sql, [dateid, workdone, attitude, homework, memo, rate], (err, results) => {
         if (err) return res.status(500).send(err);
            res.status(201).json({
                message: 'Feedback created successfully',
                feedbackId: insertResults.insertId, // new feedback id
            });
        });
    });
}

exports.editFeedback = (req, res) => {
    const { feedbackId } = req.body;
    const { workdone, attitude, homework, memo, rate } = req.body;

    const sql = `
        UPDATE feedback 
        SET 
            workdone = ?, 
            attitude = ?, 
            homework = ?, 
            memo = ?, 
            rate = ?, 
            updatedAt = NOW()
        WHERE feedbackid = ?
    `;

    db.query(sql, [workdone, attitude, homework, memo, rate, feedbackId], (err, results) => {
            if (err) {
                console.error('Error updating feedback:', err);
                return res.status(500).send(err);
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Feedback not found.' });
            }

            res.status(200).json({
                message: 'Feedback updated successfully.',
                feedbackId,
            });
        }
    );
}