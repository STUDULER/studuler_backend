const db = require('../config/db');

exports.getUnpaidDates = async (req, res) => {
    const teacherId = req.userId;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const getClassIdsSql = `SELECT classid FROM classes WHERE teacherid = ?`;
        const [classIdsResult] = await connection.query(getClassIdsSql, [teacherId]);

        if (classIdsResult.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `No classes found for teacher ID ${teacherId}` });
        }

        const classIds = classIdsResult.map(row => row.classid);
        const results = {};

        for (const classId of classIds) {
            // fetch unpaid dates for the class
            const unpaidPaymentsSql = `
                SELECT date, cost
                FROM payment
                WHERE unpay = true AND classid = ?
                ORDER BY date ASC
            `;
            const [unpaidResults] = await connection.query(unpaidPaymentsSql, [classId]);

            if (unpaidResults.length > 0) {
                // group unpaid payments by classid
                results[classId] = { dates: unpaidResults, unpaid: true };
            } else { // if no unpaid dates
                // fetch the second most recent payment date
                const secondMostRecentDateSql = `
                    SELECT date
                    FROM payment
                    WHERE classid = ?
                    ORDER BY date DESC
                    LIMIT 1 OFFSET 1
                `;
                const [secondMostRecentResult] = await connection.query(secondMostRecentDateSql, [classId]);

                if (secondMostRecentResult.length > 0) {
                    results[classId] = {
                        dates: secondMostRecentResult[0].date,
                        unpaid: false
                    };
                } else {
                    results[classId] = {
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

    const sql = `SELECT p.date, p.cost FROM payment p JOIN classes c ON p.paymentid = c.paymentid WHERE c.classid = ?`;

    try {
        const [results] = await db.query(sql, [classId]);

        if (results.length === 0) {
            return res.status(404).json({ message: `No next payment found for class ID ${classId}` });
        }

        res.status(200).json({
            message: `Next payment retrieved successfully`,
            nextPayment: results[0] // returns the date and cost of the next payment
        });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }
};