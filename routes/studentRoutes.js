const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const studentController = require('../controllers/studentController');
const { authenticateJWT } = require('../jwt/auth');

router.get('/', studentController.getStudents);
router.post('/signup', upload.none(), (req, res) => {
    studentController.signupStudent(req, res);
});
router.post('/loginWithMail', upload.none(), (req, res) => {
    studentController.loginStudent(req, res);
});
router.post('/loginWithKakao', upload.none(), (req, res) => {
    studentController.loginStudentWithKakao(req, res);
});
router.post('/loginWithGoogle', upload.none(), (req, res) => {
    studentController.loginStudentWithGoogle(req, res);
});
router.post('/signout', authenticateJWT, upload.none(), (req, res) => {
    studentController.signoutStudent(req, res);
});
router.get('/name', authenticateJWT, (req, res) => {
    studentController.getName(req, res);
});

module.exports = router;
