const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticateJWT } = require('../jwt/auth');
const multer = require('multer');
const upload = multer();

router.get('/', teacherController.getTeachers);
//router.get('/', authenticateJWT, teacherController.getTeachers);
router.post('/signup', upload.none(), teacherController.signupTeacher); // for postman's form-data format
//router.post('/signup', teacherController.signupTeacher); // for application-json format
router.post('/loginWithMail', upload.none(), teacherController.loginTeacher);
router.post('/loginWithKakao', upload.none(), teacherController.loginTeacherWithKakao);
router.post('/loginWithGoogle', upload.none(), teacherController.loginTeacherWithGoogle);
router.post('/signout', authenticateJWT, teacherController.signoutTeacher);

module.exports = router;
