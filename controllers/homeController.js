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
    const { classname, studentname, startdate, period, time, day, hourlyrate, prepay, themecolor } = req.body;
    const userId = req.userId;
    console.log('Received data:', req.body);
    console.log('Authenticated teacher ID:', userId);

    const classcode = uuidv4().split('-')[0]; // create classcode
    if (!day || typeof day !== 'string') {
        return res.status(400).json({ message: 'Invalid or missing day field in request body.' });
    }

    const sql = `INSERT INTO classes 
                (classname, studentname, period, time, day, hourlyrate, prepay, themecolor, teacherid, classcode, dateofpayment, createdAt, updatedAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

    const dayMapping = { "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6, "일": 0 };
    const daysOfWeek = day.split('/').map(d => dayMapping[d]).filter(d => d !== undefined);
    if (daysOfWeek.length === 0) {
        return res.status(400).json({ message: 'Invalid day input' });
    }

    const startDate = new Date(startdate);
    if (isNaN(startDate)) {
        return res.status(400).json({ message: 'Invalid startdate format' });
    }
    const dates = [];

    db.query(sql, [classname, studentname, period, time, day, hourlyrate, prepay, themecolor, userId, classcode, null], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send(err);
        }

        const classId = result.insertId;

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
        db.query(sqlInsertPayment, [dateofpayment, totalCost, unpaid, classId], (paymentErr, paymentResult) => {
            if (paymentErr) {
                console.error('Database query error (insert payment):', paymentErr);
                return res.status(500).send(paymentErr);
            }
    
            const paymentId = paymentResult.insertId;
        
        // update paymentid in the `classes` table
        const sqlUpdateClassPaymentId = `UPDATE classes SET paymentid = ? WHERE classid = ?`;
        db.query(sqlUpdateClassPaymentId, [paymentId, classId], (updateErr) => {
            if (updateErr) {
                console.error('Database update error:', updateErr);
                return res.status(500).send(updateErr);
            }

            // insert generated dates into the `dates` table
            const sqlDates = `INSERT INTO dates (classid, date, time, feedback_written, createdAt, updatedAt) 
                              VALUES (?, ?, ?, ?, NOW(), NOW())`;
            const dateInserts = dates.map(({ classId, date, time, feedback_written }) =>
                new Promise((resolve, reject) => {
                    db.query(sqlDates, [classId, date, time, feedback_written], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                })
            );

            Promise.all(dateInserts)
                .then(() => {
                    res.status(201).json({
                        message: 'Class and dates created successfully',
                        classId,
                        classname,
                        classcode,
                        dateofpayment,
                        dates: dates.map(d => d.date),
                    });
                })
                .catch(err => {
                    console.error('Database query error (dates):', err);
                    res.status(500).send(err);
                });
        });
    });
});
};

// student joins class
exports.joinClass = (req, res) => {
    const { classcode } = req.body;
    const userId = req.userId;

    console.log('Received data:', req.body);
    console.log('Authenticated student ID:', userId);

    const sql = 'UPDATE classes SET studentid = ? WHERE classcode = ? AND studentid IS NULL';

    // 두개 query 적용 위해 transaction 사용
    db.beginTransaction((err) => {
        if (err) {
            console.error('Transaction start error:', err);
            return res.status(500).send(err);
        }

        // insert studentid in classes relation
        const updateClassSql = 'UPDATE classes SET studentid = ? WHERE classcode = ? AND studentid IS NULL';
        db.query(updateClassSql, [userId, classcode], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Database query error:', updateErr);
                return db.rollback(() => res.status(500).send(updateErr));
            }

            if (updateResult.affectedRows === 0) {
                // No rows updated, rollback transaction
                return db.rollback(() => {
                    res.status(400).json({ message: 'Could not join the class. Make sure the class exists and has no student yet.' });
                });
            }
            
            // insert new tuple in student_classinfo
            const insertClassInfoSql = `
                INSERT INTO student_classinfo (studentid, classid, classname, teachername, themecolor, createdAt, updatedAt)
                SELECT ?, c.classid, c.classname, t.name AS teachername, c.themecolor, NOW(), NOW()
                FROM classes c
                JOIN teachers t ON c.teacherid = t.teacherid
                WHERE c.classcode = ?
            `;
            db.query(insertClassInfoSql, [userId, classcode], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error('Database query error:', insertErr);
                    return db.rollback(() => res.status(500).send(insertErr));
                }

                db.commit((commitErr) => {
                    if (commitErr) {
                        console.error('Transaction commit error:', commitErr);
                        return db.rollback(() => res.status(500).send(commitErr));
                    }

                    res.status(200).json({ message: 'Successfully joined the class and updated class info.' });
                });
            });
        });
    });
};

// each class information for teacher's home screen
exports.getEachClassTeacher = (req, res) => { 
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    // 학생이름, 요일, 정산방법, 수업횟수, 다음정산일, 수업코드, 제목, 진행수업횟수, 테마색상
    const sql = `
        SELECT 
            S.name, 
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

    // 선생이름, 요일, 정산방법, 수업횟수, 다음정산일, 수업코드, 제목, 진행수업횟수, 테마색상
    const sql = `
        SELECT 
            SCI.teachername, 
            C.classid, 
            C.classcode, 
            SCI.classname,
            C.day, 
            C.time
            C.period, 
            C.dateofpayment, 
            C.hourlyrate, 
            C.prepay, 
            SCI.themecolor 
        FROM 
            student_classinfo AS SCI
        JOIN 
            classes AS C ON SCI.classid = C.classid
        WHERE 
            SCI.studentid = ?`;
            
    db.query(sql, [studentId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};

// modify class info by teacher
exports.updateEachClassTeacher = (req, res) => { 
    const { classcode, studentname, classname, day, time, period, dateofpayment, hourlyrate, prepay, themecolor } = req.body;
    const teacherId = req.userId;

    console.log('Teacher ID:', req.userId);

    const sql = `
        UPDATE classes AS C
        JOIN teachers AS T ON T.teacherid = C.teacherid
        SET 
            C.studentname = ?,
            C.classname = ?, 
            C.day = ?, 
            C.time = ?, 
            C.period = ?, 
            C.dateofpayment = ?, 
            C.hourlyrate = ?, 
            C.prepay = ?, 
            C.themecolor = ?,
            C.updatedAt = NOW()
        WHERE 
            T.teacherid = ? 
            AND C.classcode = ?`;
            
    db.query(sql, [teacherId], (err, results) => {
        if (err) return res.status(500).send(err);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
    });
};

// modify class info by student
exports.updateEachClassStudent = (req, res) => { 
    const { classcode, teachername, classname, themecolor } = req.body;
    const studentId = req.userId;

    console.log('student ID:', studentId);

    const sql = `
        UPDATE student_classinfo AS SCI
        JOIN students AS S ON S.studentid = SCI.studentid
        JOIN classes AS C ON C.classid = SCI.classid
        SET 
            SCI.teachername = ?,
            SCI.classname = ?, 
            SCI.themecolor = ?,
            SCI.updatedAt = NOW()
        WHERE 
            SCI.studentid = ? 
            AND C.classcode = ?`;
            
    db.query(sql, [studentId], (err, results) => {
        if (err) return res.status(500).send(err);

        if (results.affectedRows === 0) {
            return res.status(400).json({ message: 'No class found to update. Ensure you own the class and it exists.' });
        }

        res.json({ message: 'Class information updated successfully.' });
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

    db.query(sql, [classId, teacherId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
};
