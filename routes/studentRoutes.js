const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const studentController = require('../controllers/studentController');
const { authenticateJWT } = require('../jwt/auth');

router.get('/', studentController.getStudents);
router.post('/signup', upload.none(), studentController.signupStudent);
router.post('/loginWithMail', upload.none(), studentController.loginStudent);
router.post('/loginWithKakao', upload.none(), studentController.loginStudentWithKakao);
router.post('/loginWithGoogle', upload.none(), studentController.loginStudentWithGoogle);
router.post('/signout', authenticateJWT, upload.none(), (req, res) => {
    studentController.signoutStudent(req, res);
});
router.get('/name', authenticateJWT, (req, res) => {
    studentController.getName(req, res);
});

module.exports = router;
