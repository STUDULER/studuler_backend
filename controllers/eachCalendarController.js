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

exports.deleteLesson = (req, res) => { // delete the date and then 
    const { classId, dateToDelete } = req.body;

    if (!classId || !dateToDelete) {
        return res.status(400).json({ message: 'Invalid or missing classId or dateToDelete field in request body.' });
    }

    const getClassSql = `SELECT day, period, time FROM classes WHERE classid = ?`;
    db.query(getClassSql, [classId], (err, classResult) => {
        if (err || classResult.length === 0) {
            console.error('Database query error (get class):', err);
            return res.status(500).send(err || { message: 'Class not found' });
        }
        const { day, period, time } = classResult[0];
        const dayMapping = { "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6, "일": 0 };
        const daysOfWeek = day.split('/').map(d => dayMapping[d]).filter(d => d !== undefined);

        // delete the lesson
        const deleteLessonSql = `DELETE FROM dates WHERE classid = ? AND date = ?`;
        db.query(deleteLessonSql, [classId, dateToDelete], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error('Database query error (delete lesson):', deleteErr);
                return res.status(500).send(deleteErr);
            }

            // find the next available date after the deleted date
            const currentDate = new Date(dateToDelete);
            let nextDate = new Date(currentDate);
            let newLessonAdded = false;
            let attempts = 0;
            
            while (!newLessonAdded && attempts < 30) {
                nextDate.setDate(nextDate.getDate() + 1); // Move to the next day
                if (daysOfWeek.includes(nextDate.getDay())) {
                    const formattedDate = nextDate.toISOString().split('T')[0];

                    // check if the new date already exists in the `dates` table
                    const checkDateSql = `SELECT * FROM dates WHERE classid = ? AND date = ?`;
                    db.query(checkDateSql, [classId, formattedDate], (checkErr, checkResult) => {
                        if (checkErr) {
                            console.error('Database query error (check date):', checkErr);
                            return res.status(500).send(checkErr);
                        }

                        if (checkResult.length === 0) {
                            // insert new lesson 
                            const insertNewDateSql = `INSERT INTO dates (classid, date, time, feedback_written, createdAt, updatedAt) VALUES (?, ?, ?, 0, NOW(), NOW())`;
                            db.query(insertNewDateSql, [classId, formattedDate, time], (insertErr, insertResult) => {
                                if (insertErr) {
                                    console.error('Database query error (insert new date):', insertErr);
                                    return res.status(500).send(insertErr);
                                }

                                const newDateId = insertResult.insertId;
                                const insertFeedbackSql = `INSERT INTO feedback (dateid, workdone, attitude, homework, memo, rate, createdAt, updatedAt) VALUES (?, '', '', 0, '', 0, NOW(), NOW())`;
                                db.query(insertFeedbackSql, [newDateId], (feedbackErr, feedbackResult) => {
                                    if (feedbackErr) {
                                        console.error('Database query error (insert feedback):', feedbackErr);
                                        return res.status(500).send(feedbackErr);
                                    }

                                    newLessonAdded = true;
                                    res.status(200).json({
                                        message: 'deleted successfully',
                                        newDate: formattedDate,
                                    });
                                });
                            });
                        }
                    });
                }
                attempts++;
            }

            if (!newLessonAdded && attempts >= 30) {
                return res.status(500).json({ message: 'Failed to generate a new lesson date within the limit' });
            }
        });
    });
};

exports.addNewLesson = (req, res) => { // delete the last date and then create new date
    const {classId, newDate} = req.body;

    if (!classId || !newDate) {
        return res.status(400).json({ message: 'Invalid or missing classId or newDate field in request body.' });
    }

    const getLastDateSql = `SELECT date FROM dates WHERE classid = ? ORDER BY date ASC LIMIT 1`;
    db.query(getLastDateSql, [classId], (getLastDateErr, lastDateResult) => {
        if (getLastDateErr || lastDateResult.length === 0) {
            console.error('Database query error (get last date):', getLastDateErr);
            return res.status(500).send(getLastDateErr || { message: 'No dates found to delete' });
        }

        // delete the last date first
        const lastDateToDelete = lastDateResult[0].date;

        const deleteLastDateSql = `DELETE FROM dates WHERE classid = ? AND date = ?`;
        db.query(deleteLastDateSql, [classId, lastDateToDelete], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error('Database query error (delete last date):', deleteErr);
                return res.status(500).send(deleteErr);
            }

            console.log('Deleted last date:', lastDateToDelete);

            // insert the new lesson date
            const getClassSql = `SELECT time FROM classes WHERE classid = ?`;
            db.query(getClassSql, [classId], (getClassErr, classResult) => {
                if (getClassErr || classResult.length === 0) {
                    console.error('Database query error (get class):', getClassErr);
                    return res.status(500).send(getClassErr || { message: 'Class not found' });
                }

                const { time } = classResult[0];

                const insertNewDateSql = `INSERT INTO dates (classid, date, time, feedback_written, createdAt, updatedAt)
                                          VALUES (?, ?, ?, 0, NOW(), NOW())`;
                db.query(insertNewDateSql, [classId, newDate, time], (insertErr, insertResult) => {
                    if (insertErr) {
                        console.error('Database query error (insert new date):', insertErr);
                        return res.status(500).send(insertErr);
                    }

                    const newDateId = insertResult.insertId;

                    // insert a new feedback for the new date
                    const insertFeedbackSql = `INSERT INTO feedback (dateid, workdone, attitude, homework, memo, rate, createdAt, updatedAt)
                                               VALUES (?, '', '', 0, '', 0, NOW(), NOW())`;
                    db.query(insertFeedbackSql, [newDateId], (feedbackErr, feedbackResult) => {
                        if (feedbackErr) {
                            console.error('Database query error (insert feedback):', feedbackErr);
                            return res.status(500).send(feedbackErr);
                        }

                        res.status(200).json({
                            message: 'created successfully',
                            deletedDate: lastDateToDelete,
                        });
                    });
                });
            });
        });
    });
};