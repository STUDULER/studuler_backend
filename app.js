const express = require('express');
const app = express();
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const homeRoutes = require('./routes/homeRoutes');
const totalRoutes = require('./routes/totalCalendarRoutes');
const eachRoutes = require('./routes/eachCalendarRoutes');
const authenticateJWT = require('./jwt/auth');
const PORT = 80;

app.use(express.json());
//app.use(express.urlencoded({ extended: true }));
app.use('/teachers', teacherRoutes); // just for checking work easily
//app.use('/teachers', authenticateJWT, teacherRoutes); // this is correct one
//app.use("/students", authenticateJWT, studentRoutes);
app.use("/home", homeRoutes);
app.use("/total", totalRoutes);
app.use("/each", eachRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to STUDULER');
});

app.listen(PORT, () => {
    console.log("Server is running");
});
