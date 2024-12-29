const mysql = require('mysql2');
require('dotenv').config();

/*const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});*/

const pool = mysql.createPool({ // use pool to manage connections
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10, // limit the number of concurrent connections
    queueLimit: 0
});

/*db.connect(err => {
    if (err) console.error('Database connection failed:', err.stack);
    else console.log('Connected to database.');
});*/

module.exports = pool.promise(); // for async/await support
