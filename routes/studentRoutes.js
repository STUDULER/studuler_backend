const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const studentController = require('../controllers/studentController');
const authenticateJWT = require('../jwt/auth');

router.get('/', authenticateJWT, studentController.getStudents);
//router.post('/', upload.single('image'), studentController.createStudent);

module.exports = router;
