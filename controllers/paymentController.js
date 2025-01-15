const db = require('../config/db');

exports.getUnpaidDatesTeacher = async (req, res) => {
    const teacherId = req.userId;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const getClassIdsSql = `SELECT classid, paymentid FROM classes WHERE teacherid = ?`;
        const [classIdsResult] = await connection.query(getClassIdsSql, [teacherId]);

        if (classIdsResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `No classes found for teacher ID ${teacherId}` });
        }

        const classIds = classIdsResult.map(row => ({ classid: row.classid, excludedPaymentId: row.paymentid }));
        const results = {};

        for (const { classid, excludedPaymentId } of classIds) {
            // fetch unpaid dates for the class
            const unpaidPaymentsSql = `
                SELECT date, cost
                FROM payment
                WHERE unpay = true AND classid = ? AND paymentid != ?
                ORDER BY date ASC
            `;
            const [unpaidResults] = await connection.query(unpaidPaymentsSql, [classid, excludedPaymentId]);

            if (unpaidResults.length > 0) {
                // group unpaid payments by classid
                results[classid] = { dates: unpaidResults, unpaid: true };
            } else { // if no unpaid dates
                // fetch the second most recent payment date
                const secondMostRecentDateSql = `
                    SELECT date, cost
                    FROM payment
                    WHERE classid = ?
                    AND paymentid != ?
                    ORDER BY date DESC
                    LIMIT 1
                `;
                const [secondMostRecentResult] = await connection.query(secondMostRecentDateSql, [classid, excludedPaymentId]);

                if (secondMostRecentResult.length > 0) {
                    results[classid] = {
                        dates: { "date": secondMostRecentResult[0].date, "cost": secondMostRecentResult[0].cost},
                        unpaid: false
                    };
                } else {
                    results[classid] = {
                        dates: null,
                        unpaid: false
                    };
                }
            }
        }

        await connection.commit();
        res.status(200).json(results);
    } catch (err) {
        await connection.rollback();
        console.error('Error retrieving unpaid dates:', err);
        res.status(500).json({ message: 'An error occurred while retrieving unpaid dates', error: err.message });
    } finally {
        connection.release();
    }
};

exports.getUnpaidDatesStudent = async (req, res) => {
    const studentId = req.userId;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const getClassIdsSql = `SELECT classid, paymentid FROM classes WHERE studentid = ?`;
        const [classIdsResult] = await connection.query(getClassIdsSql, [studentId]);

        if (classIdsResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `No classes found for student ID ${studentId}` });
        }

        const classIds = classIdsResult.map(row => ({ classid: row.classid, excludedPaymentId: row.paymentid }));
        const results = {};

        for (const { classid, excludedPaymentId } of classIds) {
            // fetch unpaid dates for the class
            const unpaidPaymentsSql = `
                SELECT date, cost
                FROM payment
                WHERE unpay = true AND classid = ? AND paymentid != ?
                ORDER BY date ASC
            `;
            const [unpaidResults] = await connection.query(unpaidPaymentsSql, [classid, excludedPaymentId]);

            if (unpaidResults.length > 0) {
                // group unpaid payments by classid
                results[classid] = { dates: unpaidResults, unpaid: true };
            } else { // if no unpaid dates
                // fetch the second most recent payment date
                const secondMostRecentDateSql = `
                    SELECT date, cost
                    FROM payment
                    WHERE classid = ?
                    AND paymentid != ?
                    ORDER BY date DESC
                    LIMIT 1
                `;
                const [secondMostRecentResult] = await connection.query(secondMostRecentDateSql, [classid, excludedPaymentId]);

                if (secondMostRecentResult.length > 0) {
                    results[classid] = {
                        dates: { "date": secondMostRecentResult[0].date, "cost": secondMostRecentResult[0].cost},
                        unpaid: false
                    };
                } else {
                    results[classid] = {
                        dates: null,
                        unpaid: false
                    };
                }
            }
        }

        await connection.commit();
        res.status(200).json(results);
    } catch (err) {
        await connection.rollback();
        console.error('Error retrieving unpaid dates:', err);
        res.status(500).json({ message: 'An error occurred while retrieving unpaid dates', error: err.message });
    } finally {
        connection.release();
    }
};

exports.getNextPayment = async (req, res) => {
    const { classId } = req.body;

    if (!classId) {
        return res.status(400).json({ message: 'classId is required' });
    }

    const sql = `SELECT p.date, p.cost, p.unpay FROM payment p JOIN classes c ON p.paymentid = c.paymentid WHERE c.classid = ?`;

    try {
        const [results] = await db.query(sql, [classId]);

        if (results.length === 0) {
            return res.status(404).json({ message: `No next payment found for class ID ${classId}` });
        }

        res.status(200).json({
            message: `Next payment retrieved successfully`,
            nextPayment: {
                date: results[0].date,
                cost: results[0].cost,
                unpay: results[0].unpay
            }
        });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

exports.updateAsPaid = async (req, res) => {
    const { classId, paidDate } = req.body;

    const sql = `UPDATE payment SET unpay = 0 WHERE classid = ? AND date = ?`;

    try {
        const [results] = await db.query(sql, [classId, paidDate]);

        if (results.length === 0) {
            return res.status(404).json({ message: `No class ID ${classId} or date ${paidDate}` });
        }

        res.status(200).json({
            message: `paid successfully!`
        });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

exports.getPaymentInfo = async (req, res) => {
    const { classId } = req.body;

    const sql = `SELECT T.account, T.bank, T.name FROM classes AS C LEFT JOIN teachers AS T ON C.teacherid = T.teacherid WHERE C.classid = ?`;

    try {
        const [results] = await db.query(sql, [classId]);

        if (results.length === 0) {
            return res.status(404).json({ message: `No class ID ${classId}` });
        }

        res.status(200).json(results[0]);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

exports.getStudentFCMByTeacher = async (req, res) => {
    const { classId } = req.body;
    const teacherId = req.userId;

    const sql = `SELECT studentFCM FROM classes WHERE classid = ? AND teacherid = ?`;

    try {
        const [results] = await db.query(sql, [classId, teacherId]);

        if (results.length === 0) {
            return res.status(404).json({ message: `No class ID ${classId}` });
        }

        res.status(200).json({
            studentFCM: results[0].studentFCM
        });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

exports.getTeacherFCMByStudent = async (req, res) => {
    const { classId } = req.body;
    const studentId = req.userId;

    const sql = `SELECT teacherFCM FROM classes WHERE classid = ? AND studentid = ?`;

    try {
        const [results] = await db.query(sql, [classId, studentId]);

        if (results.length === 0) {
            return res.status(404).json({ message: `No class ID ${classId}` });
        }

        res.status(200).json({
            teacherFCM: results[0].teacherFCM
        });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};

exports.getKakaopayLink = async (req, res) => {
    const { classId } = req.body;

    const sql = `SELECT T.kakaopayLink FROM classes AS C LEFT JOIN teachers AS T ON C.teacherid = T.teacherid WHERE C.classid = ?`;

    try {
        const [results] = await db.query(sql, [classId]);

        if (results.length === 0) {
            return res.status(404).json({ message: `No class ID ${classId}` });
        }

        res.status(200).json(results[0]);
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};