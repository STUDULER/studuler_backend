const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.getClasses = async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM classes');
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

exports.getClassIdT = async (req, res) => {
    const userId = req.userId;
    try{
        const [results] = await db.query('SELECT classid, classname, themecolor FROM classes WHERE teacherid = ?', [userId]);
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
}

exports.getClassIdS = async (req, res) => {
    const userId = req.userId;
    try{
        const [results] = await db.query('SELECT classid, classname, themecolor FROM classes WHERE studentid = ?', [userId]);
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
}

// class created by teacher
exports.createClassTeacher = async (req, res) => {
    const { classname, studentname, startdate, period, time, day, hourlyrate, prepay, themecolor, teacherFCM } = req.body;
    const userId = req.userId;
    console.log('Received data:', req.body);
    console.log('Authenticated teacher ID:', userId);

    const classcode = uuidv4().split('-')[0]; // create classcode

    try {
        if (!day || typeof day !== 'string') {
            return res.status(400).json({ message: 'Invalid or missing day field in request body.' });
        }

        const sql = `INSERT INTO classes 
                (classname, studentname, period, time, day, hourlyrate, prepay, themecolor, teacherid, classcode, dateofpayment, teacherFCM, createdAt, updatedAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

        const dayMapping = { "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6, "일": 0 };
        const daysOfWeek = day.split('/').map(d => dayMapping[d]).filter(d => d !== undefined);
        if (daysOfWeek.length === 0) {
            return res.status(400).json({ message: 'Invalid day input' });
        }

        const startDate = new Date(startdate);
        if (isNaN(startDate)) {
            return res.status(400).json({ message: 'Invalid startdate format' });
        }


        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {

            const dates = [];

            const [classResult] = await connection.query(sql, [classname, studentname, period, time, day, hourlyrate, prepay, themecolor, userId, classcode, null, teacherFCM]);

            const classId = classResult.insertId;

            let currentDate = new Date(startDate);
            let count = 0;
            while (count < period) {
                if (daysOfWeek.includes(currentDate.getDay())) {
                    dates.push({
                        classId,
                        date: currentDate.toISOString().split('T')[0], // format as YYYY-MM-DD
                        time,
                        feedback_written: false,
                    });
                    count++;
                }
                currentDate.setDate(currentDate.getDate() + 1); // move to the next day
            }

            const prepayValue = Number(prepay);
            const hourlyRate = Number(hourlyrate);
            const classTime = Number(time);
            const totalCost = hourlyRate * classTime * period;

            // determine the `dateofpayment`
            const dateofpayment = prepayValue === 0
                ? dates[dates.length - 1].date // last date
                : dates[0].date; // first date
            const unpaid = true;

            // create payment tuple
            const sqlInsertPayment = `INSERT INTO payment (date, cost, unpay, classid, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())`;
            const [paymentResult] = await connection.query(sqlInsertPayment, [dateofpayment, totalCost, unpaid, classId]);
            const paymentId = paymentResult.insertId;

            // update paymentid in the `classes` table
            const sqlUpdateClassPaymentId = `UPDATE classes SET dateofpayment = ?, paymentid = ? WHERE classid = ?`;
            await connection.query(sqlUpdateClassPaymentId, [dateofpayment, paymentId, classId]);

            // insert generated dates into the `dates` table
            for (const dateObj of dates) {
                await connection.query(
                    `INSERT INTO dates (classid, date, time, feedback_written, createdAt, updatedAt) 
                    VALUES (?, ?, ?, ?, NOW(), NOW())`,
                    [dateObj.classId, dateObj.date, dateObj.time, dateObj.feedback_written]
                );
            }

            await connection.commit();
            res.status(201).json({
                message: 'Class and dates created successfully',
                classId,
                classname,
                classcode,
                dateofpayment,
                dates: dates.map(d => d.date)
            });

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

// student joins class
exports.joinClass = async (req, res) => {
    const { classcode, studentFCM } = req.body;
    const userId = req.userId;

    console.log('Received data:', req.body);
    console.log('Authenticated student ID:', userId);

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // insert studentid in classes relation
        const updateClassSql = 'UPDATE classes SET studentid = ?, studentFCM = ? WHERE classcode = ? AND studentid IS NULL';
        const [updateResult] = await connection.query(updateClassSql, [userId, studentFCM, classcode]);
        if (updateResult.affectedRows === 0) {
            // No rows updated, rollback transaction
            return connection.rollback(() => {
                res.status(400).json({ message: 'Could not join the class. Make sure the class exists and has no student yet.' });
            });
        }

        const fetchClassInfoSql = `
            SELECT c.classname 
            FROM classes c
            JOIN teachers t ON c.teacherid = t.teacherid
            WHERE c.classcode = ?
        `;

        const [classInfoRows] = await connection.query(fetchClassInfoSql, [classcode]);

        if (classInfoRows.length === 0) {
            throw new Error('Class information not found for the provided class code.');
        }

        const { classname } = classInfoRows[0];


        // insert new tuple in student_classinfo
        const insertClassInfoSql = `
                INSERT INTO student_classinfo (studentid, classid, classname, teachername, themecolor, createdAt, updatedAt)
                SELECT ?, c.classid, c.classname, t.username AS teachername, c.themecolor, NOW(), NOW()
                FROM classes c
                JOIN teachers t ON c.teacherid = t.teacherid
                WHERE c.classcode = ?
            `;
        await connection.query(insertClassInfoSql, [userId, classcode]);

        await connection.commit();
        res.status(200).json({ message: 'Successfully joined the class and updated class info.', classname: classname});
    } catch (err) {
        // If anything goes wrong, rollback the transaction
        await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({
            error: 'Failed to join class',
            details: err.message
        });
    } finally {
        // Always release the connection back to the pool
        connection.release();
    }
};

// each class information for teacher's home screen
exports.getEachClassTeacher = async (req, res) => {
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    // 학생이름, 요일, 정산방법, 수업횟수, 다음정산일, 수업코드, 제목, 진행수업횟수, 테마색상
    const sql = `
        SELECT 
            C.classid, 
            C.studentname,
            C.classcode, 
            C.classname,
            C.day, 
            C.time, 
            C.period, 
            C.dateofpayment, 
            C.hourlyrate, 
            C.prepay, 
            C.themecolor,
            IFNULL(MOD(FinishedLessons.finished_count, C.period), 0) AS finished_lessons
        FROM 
            classes AS C
        JOIN 
            teachers AS T ON T.teacherid = C.teacherid 
        LEFT JOIN (
            SELECT 
                D.classid, 
                COUNT(D.date) AS finished_count
            FROM 
                dates AS D
            JOIN 
                classes AS C ON D.classid = C.classid
            WHERE 
                D.date <= CURDATE()
            GROUP BY 
                D.classid
        ) AS FinishedLessons ON C.classid = FinishedLessons.classid
        WHERE 
            T.teacherid = ?`;

    try {
        const [results] = await db.query(sql, [teacherId]);
        res.json(results);
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// each class information for student's home screen
exports.getEachClassStudent = async (req, res) => {
    const studentId = req.userId;

    // 선생이름, 요일, 정산방법, 수업횟수, 다음정산일, 수업코드, 제목, 진행수업횟수, 테마색상
    const sql = `
        SELECT 
            SCI.teachername, 
            C.classid, 
            C.classcode, 
            SCI.classname,
            C.day, 
            C.time,
            C.period, 
            C.dateofpayment, 
            C.hourlyrate, 
            C.prepay, 
            SCI.themecolor, 
            IFNULL(MOD(FinishedLessons.finished_count, C.period), 0) AS finished_lessons
        FROM 
            student_classinfo AS SCI
        JOIN 
            classes AS C ON SCI.classid = C.classid 
        LEFT JOIN (
            SELECT 
                D.classid, 
                COUNT(D.date) AS finished_count
            FROM 
                dates AS D 
            WHERE 
                D.date <= CURDATE()
            GROUP BY 
                D.classid
        ) AS FinishedLessons ON C.classid = FinishedLessons.classid 
        WHERE 
            SCI.studentid = ?`;

    try {
        const [results] = await db.query(sql, [studentId]);
        res.json(results);
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by teacher
exports.updateStudentNameTeacher = async (req, res) => {
    const { classId, studentname } = req.body;
    const teacherId = req.userId;

    console.log('classid, studentname: ', classId, studentname);
    console.log('Teacher ID:', req.userId);

    // Check if classId is an integer
    if (!Number.isInteger(classId)) {
        return res.status(400).json({ message: 'Invalid classId. It must be an integer.' });
    }
    
    const sql = `
        UPDATE classes 
        SET 
            studentname = ?, 
            updatedAt = NOW() 
        WHERE 
            classid = ? AND teacherid = ?`;

    try {
        const [results] = await db.query(sql, [studentname, classId, teacherId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by teacher
exports.updateClassNameTeacher = async (req, res) => {
    const { classId, classname } = req.body;
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    const sql = `
        UPDATE classes AS C
        JOIN teachers AS T ON T.teacherid = C.teacherid
        SET 
            C.classname = ?, 
            C.updatedAt = NOW()
        WHERE 
            T.teacherid = ? 
            AND C.classid = ?`;

    try {
        const [results] = await db.query(sql, [classname, teacherId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by teacher
exports.updateDayTeacher = async (req, res) => {
    const { classId, day } = req.body;
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    const sql = `
        UPDATE classes AS C
        JOIN teachers AS T ON T.teacherid = C.teacherid
        SET 
            C.day = ?, 
            C.updatedAt = NOW()
        WHERE 
            T.teacherid = ? 
            AND C.classid = ?`;

    try {
        const [results] = await db.query(sql, [day, teacherId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by teacher
exports.updateTimeTeacher = async (req, res) => {
    const { classId, time } = req.body;
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    const sql = `
        UPDATE classes AS C
        JOIN teachers AS T ON T.teacherid = C.teacherid
        SET 
            C.time = ?, 
            C.updatedAt = NOW()
        WHERE 
            T.teacherid = ? 
            AND C.classid = ?`;

    try {
        const [results] = await db.query(sql, [time, teacherId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by teacher
exports.updatePeriodTeacher = async (req, res) => {
    const { classId, period } = req.body;
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    const sql = `
        UPDATE classes AS C
        JOIN teachers AS T ON T.teacherid = C.teacherid
        SET 
            C.period = ?, 
            C.updatedAt = NOW()
        WHERE 
            T.teacherid = ? 
            AND C.classid = ?`;

    try {
        const [results] = await db.query(sql, [period, teacherId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by teacher
exports.updateHourlyRateTeacher = async (req, res) => {
    const { classId, hourlyrate } = req.body;
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    const sql = `
        UPDATE classes AS C
        JOIN teachers AS T ON T.teacherid = C.teacherid
        SET 
            C.hourlyrate = ?, 
            C.updatedAt = NOW()
        WHERE 
            T.teacherid = ? 
            AND C.classid = ?`;

    try {
        const [results] = await db.query(sql, [hourlyrate, teacherId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by teacher
exports.updatePrepayTeacher = async (req, res) => {
    const { classId, prepay } = req.body;
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    const sql = `
        UPDATE classes AS C
        JOIN teachers AS T ON T.teacherid = C.teacherid
        SET 
            C.prepay = ?, 
            C.updatedAt = NOW()
        WHERE 
            T.teacherid = ? 
            AND C.classid = ?`;

    try {
        const [results] = await db.query(sql, [prepay, teacherId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by teacher
exports.updateThemeColorTeacher = async (req, res) => {
    const { classId, themecolor } = req.body;
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    const sql = `
        UPDATE classes AS C
        JOIN teachers AS T ON T.teacherid = C.teacherid
        SET 
            C.themecolor = ?,
            C.updatedAt = NOW()
        WHERE 
            T.teacherid = ? 
            AND C.classid = ?`;

    try {
        const [results] = await db.query(sql, [themecolor, teacherId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by student
exports.updateTeacherNameStudent = async (req, res) => {
    const { classId, teachername } = req.body;
    const studentId = req.userId;

    console.log('student ID:', studentId);

    const sql = `
        UPDATE 
            student_classinfo AS SCI 
        SET 
            SCI.teachername = ?, 
            SCI.updatedAt = NOW() 
        WHERE 
            SCI.studentid = ? 
            AND SCI.classid = ?`;

    try {
        const [results] = await db.query(sql, [teachername, studentId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by student
exports.updateClassNameStudent = async (req, res) => {
    const { classId, classname } = req.body;
    const studentId = req.userId;

    console.log('student ID:', studentId);

    const sql = `
        UPDATE student_classinfo AS SCI 
        SET 
            SCI.classname = ?, 
            SCI.updatedAt = NOW() 
        WHERE 
            SCI.studentid = ? 
            AND SCI.classid = ?`;

    try {
        const [results] = await db.query(sql, [classname, studentId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

// modify class info by student
exports.updateThemeColorStudent = async (req, res) => {
    const { classId, themecolor } = req.body;
    const studentId = req.userId;

    console.log('student ID:', studentId);

    const sql = `
        UPDATE student_classinfo AS SCI 
        SET 
            SCI.themecolor = ?, 
            SCI.updatedAt = NOW() 
        WHERE 
            SCI.studentid = ? 
            AND SCI.classid = ?`;

    try {
        const [results] = await db.query(sql, [themecolor, studentId, classId]);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};


// list of dates with unwritten feedback for teacher
exports.getUnwrittenFeedbackDates = async (req, res) => {
    const { classId, fromDate } = req.query;
    const teacherId = req.userId; // Authenticated teacherId from JWT

    const sql = `
        SELECT 
            D.dateid, 
            D.classid, 
            D.date
        FROM 
            dates AS D
        INNER JOIN 
            classes AS C ON D.classid = C.classid
        LEFT JOIN 
            feedback AS F ON D.dateid = F.dateid
        WHERE 
            D.classid = ? AND C.teacherid = ? 
            AND F.dateid IS NULL AND D.feedback_written = 0 
            AND D.date <= ?`;

    try {
        const [results] = await db.query(sql, [classId, teacherId, fromDate]);
        res.json(results);
    }
    catch (err) {
        console.error('Error executing the query:', err);
        res.status(500).send(err);
    }
};

exports.removeClass = async (req, res) => {
    const { classId } = req.body;
    const teacherId = req.userId;

    if (!classId) {
        return res.status(400).json({ message: "classId is required" });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // verify if the classId belongs to the teacher
        const verifyClassSql = `SELECT classid FROM classes WHERE classid = ? AND teacherid = ?`;
        const [classCheckResult] = await connection.query(verifyClassSql, [classId, teacherId]);
        if (classCheckResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Class not found or unauthorized access" });
        }

        // delete data in student_classinfo table
        const deleteStudentClassInfoSql = `DELETE FROM student_classinfo WHERE classid = ?`;
        await connection.query(deleteStudentClassInfoSql, [classId]);

        // delete data in payment table
        const deletePaymentSql = `DELETE FROM payment WHERE classid = ?`;
        await connection.query(deletePaymentSql, [classId]);

        // delete data in dates table
        const deleteDatesSql = `DELETE FROM dates WHERE classid = ?`;
        await connection.query(deleteDatesSql, [classId]);

        // delete data in classes table
        const deleteClassesSql = `DELETE FROM classes WHERE classid = ?`;
        await connection.query(deleteClassesSql, [classId]);

        await connection.commit();

        res.json({ message: "Class removed successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Error removing class:", err);
        res.status(500).json({ message: "Failed to remove class", error: err.message });
    } finally {
        connection.release();
    }
};

exports.getAccountInfo = async (req, res) => {
    const teacherId = req.userId;

    const sql = `SELECT name, bank, account, kakaopayLink FROM teachers WHERE teacherid = ?`;
    try {
        const [results] = await db.query(sql, [teacherId]);
        res.json(results);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

exports.updateAccountInfo = async (req, res) => {
    const { name, bank, account, kakaopayLink } = req.body;
    const teacherId = req.userId;

    console.log("account: ", account);

    const sql = `UPDATE teachers SET account = ?, bank = ?, name = ?, kakaopayLink = ? WHERE teacherid = ?`;
    try {
        await db.query(sql, [account, bank, name, kakaopayLink, teacherId]);

        res.status(201).json({ message: "updated successfully" });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};