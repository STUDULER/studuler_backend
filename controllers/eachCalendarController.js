const db = require('../config/db');

// all class information for a teacher's total calendar
exports.getEachCalendarTeacher = async (req, res) => {
    const { classId, year, month } = req.body;
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
            C.classid = ? AND 
            C.teacherid = ? AND 
            YEAR(D.date) = ? AND 
            MONTH(D.date) = ? 
        ORDER BY 
            D.date ASC`;

    try {
        const [results] = await db.query(sql, [classId, teacherId, year, month]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Class not found or no associated dates.' });
        }

        const period = results[0].period;
        const dates = results.map(row => row.date);
        const inProgressDates = dates.slice(-period); // get the last period dates

        // add the inProgress field
        const updatedResults = results.map(row => ({
            ...row,
            inProgress: inProgressDates.includes(row.date)
        }));

        res.json(updatedResults);
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// all class information for a student's total calendar
exports.getEachCalendarStudent = async (req, res) => {
    const { classId, year, month } = req.body;
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
            C.classid = ? AND 
            C.studentid = ? AND 
            YEAR(D.date) = ? AND 
            MONTH(D.date) = ? 
        ORDER BY 
            D.date ASC`;

    try {
        const [results] = await db.query(sql, [classId, studentId, year, month]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Class not found or no associated dates.' });
        }

        const period = results[0].period;
        const dates = results.map(row => row.date);

        const inProgressDates = dates.slice(-period); // get the last period dates

        // add the inProgress field
        const updatedResults = results.map(row => ({
            ...row,
            inProgress: inProgressDates.includes(row.date)
        }));

        res.json(updatedResults);
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// for each date clicked in teacher's total calendar
exports.getFeedbackByDateTeacher = async (req, res) => {
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
        LEFT JOIN feedback AS F ON F.dateid = D.dateid 
        WHERE D.date = ? AND D.classid = ? AND C.teacherid = ?;`;

    try {
        const [results] = await db.query(sql, [date, classId, teacherId]);
        res.json(results);
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};


// for each date clicked in student's total calendar 
exports.getFeedbackByDateStudent = async (req, res) => {
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
        LEFT JOIN feedback AS F ON F.dateid = D.dateid 
        WHERE D.date = ? AND D.classid = ? AND C.studentid = ?;`;

    try {
        const [results] = await db.query(sql, [date, classId, studentId]);
        res.json(results);
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

exports.createFeedback = async (req, res) => {
    const { classid, date, workdone, attitude, homework, memo, rate } = req.body;
    const teacherId = req.userId;

    const connection = await db.getConnection();

    // classid & date로 dateid 찾기
    try {
        await connection.beginTransaction();

        const getDateIdSql = `
            SELECT dateid 
            FROM dates 
            WHERE classid = ? AND date = ? 
            LIMIT 1
        `;

        const [dateResults] = await connection.query(getDateIdSql, [classid, date]);

        if (dateResults.length === 0) {
            return res.status(404).json({ message: 'No matching date found for the provided classid and date.' });
        }

        const dateid = dateResults[0].dateid;

        // insert feedback
        const sql = 'INSERT INTO feedback (dateid, workdone, attitude, homework, memo, rate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())';
        const [insertResults] = await connection.query(sql, [dateid, workdone, attitude, homework, memo, rate]);

        // Update feedback_written flag in dates table
        const updateDateSql = `
            UPDATE dates 
            SET feedback_written = true, 
                updatedAt = NOW() 
            WHERE dateid = ?
        `;
        await connection.query(updateDateSql, [dateid]);

        await connection.commit();
        res.status(201).json({
            message: 'Feedback created successfully',
            feedbackId: insertResults.insertId, // new feedback id
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error in createFeedback:', err);
        res.status(500).json({
            error: 'Failed to create feedback',
            details: err.message
        });
    } finally {
        connection.release();
    }
}

exports.editFeedback = async (req, res) => {
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

    try {
        const [results] = await db.query(sql, [workdone, attitude, homework, memo, rate, feedbackId]);

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Feedback not found.' });
        }

        res.status(200).json({
            message: 'Feedback updated successfully.',
            feedbackId,
        });
    }
    catch (err) {
        console.error('Error updating feedback:', err);
        res.status(500).send(err);
    }
}

exports.deleteLesson = async (req, res) => { // delete the date and then create the next lesson automatically
    const { classId, dateToDelete } = req.body;

    if (!classId || !dateToDelete) {
        return res.status(400).json({ message: 'Invalid or missing classId or dateToDelete field in request body.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const getClassSql = `SELECT day, period, time, prepay, dateofpayment FROM classes WHERE classid = ?`;
        const [classResult] = await connection.query(getClassSql, [classId]);
        if (classResult.length === 0) {
            return res.status(500).send({ message: 'Class not found' });
        }
        const { day, period, time, prepay, dateofpayment } = classResult[0];
        const dayMapping = { "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6, "일": 0 };
        const daysOfWeek = day.split('/').map(d => dayMapping[d]).filter(d => d !== undefined);

        // delete the lesson
        const deleteLessonSql = `DELETE FROM dates WHERE classid = ? AND date = ?`;
        await connection.query(deleteLessonSql, [classId, dateToDelete]);

        let updatedDateofPayment = null;

        // find the next available date after the deleted date
        const currentDate = new Date(dateToDelete);
        let nextDate = new Date(currentDate);
        let newLessonAdded = false;
        let attempts = 0;

        while (!newLessonAdded) {
            nextDate.setDate(nextDate.getDate() + 1); // Move to the next day
            if (daysOfWeek.includes(nextDate.getDay())) {
                const formattedDate = nextDate.toISOString().split('T')[0];

                // check if the new date already exists in the `dates` table
                const checkDateSql = `SELECT * FROM dates WHERE classid = ? AND date = ?`;
                const [checkResult] = await connection.query(checkDateSql, [classId, formattedDate]);

                if (checkResult.length === 0) {
                    // insert new lesson 
                    const insertNewDateSql = `INSERT INTO dates (classid, date, time, feedback_written, createdAt, updatedAt) VALUES (?, ?, ?, 0, NOW(), NOW())`;
                    const [insertResult] = await connection.query(insertNewDateSql, [classId, formattedDate, time]);

                    /*const newDateId = insertResult.insertId;
                    const insertFeedbackSql = `INSERT INTO feedback (dateid, workdone, attitude, homework, memo, rate, createdAt, updatedAt) VALUES (?, '', '', 0, '', 0, NOW(), NOW())`;
                    await connection.query(insertFeedbackSql, [newDateId]);
*/
                    newLessonAdded = true;

                    if (!prepay) {
                        updatedDateofPayment = formattedDate;
                    }
                    else if (prepay) {
                        const formattedDateToDelete = new Date(dateToDelete).toISOString().split('T')[0];
                        const formattedDateOfPayment = new Date(dateofpayment).toISOString().split('T')[0];

                        if (formattedDateToDelete === formattedDateOfPayment) {
                            // If prepay is true, set dateofpayment to the first date of the last `period` dates
                            const findNextDateSql = `
                                SELECT date 
                                FROM dates 
                                WHERE classid = ? AND date > ? 
                                ORDER BY date ASC 
                                LIMIT 1;
                            `;

                            const [nextDateResult] = await connection.query(findNextDateSql, [classId, dateToDelete]);
                            if (nextDateResult.length > 0) {
                                updatedDateofPayment = nextDateResult[0].date; // Retrieve the next date
                            }
                        }
                    }
                    break;
                }
            }
            attempts++;
        }

        if (updatedDateofPayment) {
            const updateDateofPaymentSql = `UPDATE classes SET dateofpayment = ? WHERE classid = ?`;
            await connection.query(updateDateofPaymentSql, [updatedDateofPayment, classId]);

            const updatePaymentSql = `UPDATE payment SET date = ? WHERE classid = ? AND date = ?`;
            await connection.query(updatePaymentSql, [updatedDateofPayment, classId, dateofpayment]);
        }

        await connection.commit();
        res.status(200).json({
            message: 'deleted successfully',
            newDate: nextDate.toISOString().split('T')[0],
            newDateOfPayment: updatedDateofPayment || "unchanged",
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error in deleteLesson:', err);
        res.status(500).json({
            error: 'Failed to delete lesson',
            details: err.message
        });
    } finally {
        connection.release();
    }
};

exports.addNewLesson = async (req, res) => { // delete the last date and then create new date
    const { classId, newDate } = req.body;

    if (!classId || !newDate) {
        return res.status(400).json({ message: 'Invalid or missing classId or newDate field in request body.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const getLastDateSql = `SELECT date FROM dates WHERE classid = ? ORDER BY date DESC LIMIT 1`;
        const [lastDateResult] = await connection.query(getLastDateSql, [classId]);
        if (lastDateResult.length === 0) {
            return res.status(500).send({ message: 'No dates found to delete' });
        }

        // delete the last date first
        const lastDateToDelete = lastDateResult[0].date;

        const deleteLastDateSql = `DELETE FROM dates WHERE classid = ? AND date = ?`;
        await connection.query(deleteLastDateSql, [classId, lastDateToDelete]);

        console.log('Deleted last date:', lastDateToDelete);

        // insert the new lesson date
        const getClassSql = `SELECT time, prepay, dateofpayment FROM classes WHERE classid = ?`;
        const [classResult] = await connection.query(getClassSql, [classId]);
        if (classResult.length === 0) {
            await connection.rollback();
            return res.status(500).send({ message: 'Class not found' });
        }

        const { time, prepay, dateofpayment } = classResult[0];

        const insertNewDateSql = `INSERT INTO dates (classid, date, time, feedback_written, createdAt, updatedAt)
                                          VALUES (?, ?, ?, 0, NOW(), NOW())`;
        const [insertResult] = await connection.query(insertNewDateSql, [classId, newDate, time]);

        const newDateId = insertResult.insertId;

        // insert a new feedback for the new date
        /*const insertFeedbackSql = `INSERT INTO feedback (dateid, workdone, attitude, homework, memo, rate, createdAt, updatedAt)
                                               VALUES (?, '', '', 0, '', 0, NOW(), NOW())`;
        await connection.query(insertFeedbackSql, [newDateId]);
*/
        const getUpdatedLastDateSql = `SELECT date FROM dates WHERE classid = ? ORDER BY date DESC LIMIT 1`;
        const [updatedLastDateResult] = await connection.query(getUpdatedLastDateSql, [classId]);
        if (updatedLastDateResult.length === 0) {
            await connection.rollback();
            return res.status(500).send({ message: 'No dates found after inserting new date' });
        }
        const updatedLastDate = updatedLastDateResult[0].date;

        let updatedDateofPayment = null;

        if (!prepay) {
            const updateDateofPaymentSql = `UPDATE classes SET dateofpayment = ? WHERE classid = ?`;
            await connection.query(updateDateofPaymentSql, [updatedLastDate, classId]);
            updatedDateofPayment = updatedLastDate

            const updatePaymentSql = `UPDATE payment SET date = ? WHERE classid = ? AND date = ?`;
            await connection.query(updatePaymentSql, [updatedDateofPayment, classId, lastDateToDelete]);
        }
        else if (prepay) {
            const formattedNewDate = new Date(newDate).toISOString().split('T')[0];
            const formattedDateOfPayment = new Date(dateofpayment).toISOString().split('T')[0];

            if (formattedNewDate < formattedDateOfPayment){
                const updateDateofPaymentSql = `UPDATE classes SET dateofpayment = ? WHERE classid = ?`;
                await connection.query(updateDateofPaymentSql, [newDate, classId]);
                updatedDateofPayment = newDate

                const updatePaymentSql = `UPDATE payment SET date = ? WHERE classid = ? AND date = ?`;
                await connection.query(updatePaymentSql, [newDate, classId, dateofpayment]);
            }
        }

        await connection.commit();
        res.status(200).json({
            message: 'created successfully',
            deletedDate: lastDateToDelete,
            newDateOfPayment: updatedDateofPayment || "unchanged",
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error in addNewLesson:', err);
        res.status(500).json({
            error: 'Failed to update lesson dates',
            details: err.message
        });
    } finally {
        connection.release();
    }
};

exports.getLastDateOfPrevious = async (req, res) => {
    const { classId } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const getPeriodSql = `SELECT period FROM classes WHERE classid = ?`;
        const [periodResult] = await connection.query(getPeriodSql, [classId]);

        if (periodResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `No class found for class ID ${classId}` });
        }
        const period = periodResult[0].period;

        const getDatesSql = `
            SELECT date
            FROM dates
            WHERE classid = ?
            ORDER BY date DESC
        `;
        const [datesResult] = await connection.query(getDatesSql, [classId]);

        if (datesResult.length < period) {
            await connection.rollback();
            return res.status(404).json({ message: `Not enough dates to calculate the last date of the previous period for class ID ${classId}` });
        }

        const targetDateIndex = period;
        const lastDateOfPrevious = datesResult[targetDateIndex] ? datesResult[targetDateIndex].date : null;

        await connection.commit();
        res.status(200).json({ lastDateOfPrevious });
    } catch (err) {
        await connection.rollback();
        console.error('Error retrieving the last date of the previous period:', err);
        res.status(500).json({ message: 'An error occurred while retrieving the last date', error: err.message });
    } finally {
        connection.release();
    }
};