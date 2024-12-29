const db = require('../config/db');

exports.getUnpaidDates = async (req, res) => {
    const { classId } = req.body;
    if (!classId) {
        return res.status(400).json({ message: 'classId is required' });
    }

    // next payment date is not classified as unpiad payment
    const nextPaymentSql = `SELECT paymentid FROM classes WHERE classid = ?`;
    try{
        const [results] = await db.query(nextPaymentSql, [classId], (err, nextPaymentResult));

        if (nextPaymentResult.length === 0) {
            return res.status(404).json({ message: `No class found with class ID ${classId}` });
        }

        const nextPaymentId = nextPaymentResult[0].paymentid;
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
    }

    // query to retrieve unpaid payments without the next payment
    const unpaidPaymentsSql = `SELECT date, cost FROM payment WHERE unpay = true AND classid = ? AND paymentid != ?`;
    try {
        const [results] = await db.query(unpaidPaymentsSql, [classId, nextPaymentId]);

        if (unpaidResults.length === 0) {
            return res.status(404).json({ message: `No unpaid payments found for class ID ${classId}` });
        }

        res.status(200).json({
            message: `Unpaid payments retrieved successfully`,
            unpaidPayments: unpaidResults // array of objects with date and cost
        });
    }
    catch (err) {
        console.error('Database query error:', err);
        res.status(500).send(err);
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