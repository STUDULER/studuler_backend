const express = require('express');
const app = express();
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const homeRoutes = require('./routes/homeRoutes');
const totalRoutes = require('./routes/totalCalendarRoutes');
const eachRoutes = require('./routes/eachCalendarRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const logout = require('./jwt/auth');
const authenticateJWT = require('./jwt/auth');
const refreshAccessToken = require('./jwt/auth');
const db = require('./config/db');
const PORT = 8443;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/teachers', teacherRoutes); // just for checking work easily
//app.use('/teachers', authenticateJWT, teacherRoutes); // this is correct one
//app.use("/students", authenticateJWT, studentRoutes);
app.use('/students', studentRoutes);
app.use("/home", homeRoutes);
app.use("/total", totalRoutes);
app.use("/each", eachRoutes);
app.use("/payment", paymentRoutes);

app.post('/logout', authenticateJWT, logout);
app.post('/refreshAccessToken', refreshAccessToken);

app.get('/', (req, res) => {
    res.send('Welcome to STUDULER');
});

/*
app.listen(PORT, () => {
    console.log("Server is running");
});

db.getConnection()
    .then(() => console.log('Connected to database.'))
    .catch((err) => console.error('Database connection failed:', err.stack));
*/

const startServer = async () => {
    try {
        // test database connection
        const connection = await db.getConnection();
        console.log('Connected to database.');
        connection.release();

        app.listen(PORT, () => {
            console.log("Server is running on port", PORT);
        });
    } catch (err) {
        console.error('Failed to connect to the database:', err);
        process.exit(1);
    }
};

startServer();