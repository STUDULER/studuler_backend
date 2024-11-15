const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const authenticateJWT = require('../jwt/auth');

router.get('/', teacherController.getTeachers);
//router.get('/', authenticateJWT, teacherController.getTeachers);
router.post('/signup', teacherController.signupTeacher);
router.post('/login', teacherController.loginTeacher);

module.exports = router;
