const db = require('../config/db');
const cron = require('node-cron');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();
const serviceAccount = require(path.resolve(`${process.env.FIREBASE_SERVICE_ACCOUNT}.json`));
//const serviceAccount = require(`./${process.env.FIREBASE_SERVICE_ACCOUNT}.json`);

const generateNextDates = async (classId) => {
    try {
        const getLastDateSql = `SELECT date FROM dates WHERE classid = ? ORDER BY date DESC LIMIT 1`;
        const [lastDateResult] = await db.query(getLastDateSql, [classId]);
        if (lastDateResult.length === 0) {
            console.error(`No dates found for classId: ${classId}`);
            return;
        }
        const lastDate = lastDateResult[0].date;

        const getClassDetailsSql = `
            SELECT time, period, day, prepay, hourlyrate 
            FROM classes 
            WHERE classid = ?`;
        const [classDetailsResult] = await db.query(getClassDetailsSql, [classId]);

        if (classDetailsResult.length === 0) {
            console.error(`Class details not found for classId: ${classId}`);
            return;
        }
        const { time, period, day, prepay, hourlyrate } = classDetailsResult[0];

        const dayMap = { "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6, "일": 0 };
        const classDays = day.split('/').map(d => dayMap[d]);

        const nextDates = [];
        let currentDate = new Date(lastDate);
        let generatedDates = 0;

        while (generatedDates < period) {
            currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
            if (classDays.includes(currentDate.getDay())) {
                nextDates.push({
                    classid: classId,
                    date: new Date(currentDate), // Clone the date
                    time,
                    feedback_written: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                generatedDates++;
            }
        }

        const insertDatesSql = `INSERT INTO dates (classid, date, time, feedback_written, createdAt, updatedAt) VALUES ?`;
        const dateValues = nextDates.map(d => [d.classid, d.date, d.time, d.feedback_written, d.createdAt, d.updatedAt]);
        const [dateInsertResult] = await db.query(insertDatesSql, [dateValues]);

        /*const fetchDateIdsSql = `
            SELECT dateid, date 
            FROM dates 
            WHERE classid = ? AND date > ? 
            ORDER BY date ASC`;
        const [insertedDates] = await db.query(fetchDateIdsSql, [classId, lastDate]);


        const feedbackEntries = insertedDates.map(d => [d.dateid, new Date(), new Date()]);
        const insertFeedbackSql = `INSERT INTO feedback (dateid, createdAt, updatedAt) VALUES ?`;
        await db.query(insertFeedbackSql, [feedbackEntries]);
*/
        const paymentDate = prepay
            ? nextDates[0].date // First date for prepay
            : nextDates[nextDates.length - 1].date; // Last date otherwise
        const paymentCost = period * hourlyrate * time;
        const insertPaymentSql = `
            INSERT INTO payment (date, cost, unpay, classid, updatedAt, createdAt) 
            VALUES (?, ?, 0, ?, NOW(), NOW())`;
        const [paymentInsertResult] = await db.query(insertPaymentSql, [paymentDate, paymentCost, classId]);

        const updateClassSql = `
            UPDATE classes 
            SET dateofpayment = ?, paymentid = ? 
            WHERE classid = ?`;
        await db.query(updateClassSql, [paymentDate, paymentInsertResult.insertId, classId]);
        console.log(`Successfully generated dates, feedback, and payment for classId: ${classId}`);
    } catch (err) {
        console.error('Error generating next period dates:', err);
    }
};

// Schedule to run daily at 11:59 PM in Seoul, Korea
cron.schedule('59 14 * * *', async () => { // 23:59 KST == 14:59 UTC
    console.log("Running daily check for generating lesson dates at 11:59 PM...");
    const sqlGetClasses = `
        SELECT c.classid 
        FROM classes c 
        JOIN (
            SELECT classid, MAX(date) AS lastDate 
            FROM dates 
            GROUP BY classid
        ) d ON c.classid = d.classid 
        WHERE d.lastDate = CURDATE()`;

    try {
        const [classes] = await db.query(sqlGetClasses);
        if (classes.length === 0) {
            console.log("No classes found for date generation.");
            return;
        }

        for (const { classid } of classes) {
            await generateNextDates(classid);
        }
    } catch (err) {
        console.error("Error in scheduled task:", err);
    }
});

exports.debugNextDates = async (req, res) => {
    console.log("start debug");

    const sqlGetClasses = `
        SELECT c.classid 
        FROM classes c 
        JOIN (
            SELECT classid, MAX(date) AS lastDate 
            FROM dates 
            GROUP BY classid
        ) d ON c.classid = d.classid 
        WHERE d.lastDate = CURDATE()`;

    try {
        const [classes] = await db.query(sqlGetClasses);
        if (classes.length === 0) {
            console.log("No classes found for date generation.");
            return;
        }

        for (const { classid } of classes) {
            await generateNextDates(classid);
        }
    } catch (err) {
        console.error("Error in scheduled task:", err);
    }
};

// manage firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
});

// send push notification
async function sendPushNotification(token, message) {
    const payload = {
        token,
        notification: {
            title: "정산 알림",
            body: message,
        },
    };

    try {
        const response = await admin.messaging().send(payload);
        console.log("Successfully sent message:", response);
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

// cron job: runs daily at 9 AM
cron.schedule('42 10 * * *', async () => { // 9 am KST == 12 am UTC
    console.log("Checking for payment reminders...");
    const query = 'SELECT classid, studentFCM FROM classes WHERE DATE(dateofpayment) = CURDATE()';

    console.log("json: ", serviceAccount);

    try {
        const [results] = await db.query(query);
        console.log("Query results:", results);

        if (results.length === 0) {
            console.log("No payment reminders found for today.");
            return;
        }
        console.log("Payment reminders to process:", results.length);

        for (const row of results) {
            if (row.studentFCM) {
                console.log(`Sending notification to class ID ${row.classid} with token ${row.studentFCM}`);
                await sendPushNotification(row.studentFCM, "오늘은 정산일입니다!");
            } else {
                console.warn(`No FCM token found for class ID: ${row.classid}`);
            }
        }
    } catch (err) {
        console.error("Error in messaging task:", err);
    }
});