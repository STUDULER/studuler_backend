const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticateJWT } = require('../jwt/auth');
const multer = require('multer');
const upload = multer();

router.get('/', teacherController.getTeachers);
router.post('/signup', upload.none(), (req, res) => {
    teacherController.signupTeacher(req, res);
});
router.post('/loginWithMail', upload.none(), (req, res) => {
    teacherController.loginTeacher(req, res);
});
router.post('/loginWithKakao', upload.none(), (req, res) => {
    teacherController.loginTeacherWithKakao(req, res);
});
router.post('/loginWithGoogle', upload.none(), (req, res) => {
    teacherController.loginTeacherWithGoogle(req, res);
});
router.post('/signout', authenticateJWT, upload.none(), (req, res) => {
    teacherController.signoutTeacher(req, res);
});
router.get('/name', authenticateJWT, (req, res) => {
    teacherController.getName(req, res);
});
router.get('/checkMail', (req, res) => {
    teacherController.checkMailTeacher(req, res);
});

module.exports = router;
