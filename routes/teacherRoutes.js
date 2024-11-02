const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const teacherController = require('../controllers/teacherController');
const authenticateJWT = require('../jwt/auth');

router.get('/', teacherController.getTeachers);
//router.get('/', authenticateJWT, teacherController.getTeachers);
router.post('/signup', upload.single('image'),teacherController.signupTeacher);
router.post('/login', teacherController.loginTeacher);

module.exports = router;
