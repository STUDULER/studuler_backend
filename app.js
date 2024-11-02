const express = require('express');
const app = express();
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const homeRoutes = require('./routes/homeRoutes');
const authenticateJWT = require('./jwt/auth');
const PORT = 3000;

app.use(express.json());
app.use('/teachers', teacherRoutes);
//app.use('/teachers', authenticateJWT, teacherRoutes);
app.use("/students", authenticateJWT, studentRoutes);
app.use("/home", homeRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to STUDULER 2');
});

app.listen(PORT, () => {
    console.log("Server is running on http://localhost:${PORT}");
});