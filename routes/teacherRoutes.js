const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const authenticateJWT = require('../jwt/auth');
const multer = require('multer');
const upload = multer();

router.get('/', teacherController.getTeachers);
//router.get('/', authenticateJWT, teacherController.getTeachers);
router.post('/signup', upload.none(), teacherController.signupTeacher); // for postman's form-data format
//router.post('/signup', teacherController.signupTeacher); // for application-json format
router.post('/login', teacherController.loginTeacher);

module.exports = router;
