const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const totalCalendarController = require('../controllers/totalCalendarController');
const { authenticateJWT } = require('../jwt/auth');

router.get('/', totalCalendarController.getClassesid);

// get classes information for total calendar for teacher
router.get('/calendarT', authenticateJWT, (req, res) => {
    totalCalendarController.getAllClassTeacher(req, res);
});
// get classes information for total calendar for student
router.get('/calendarS', authenticateJWT, (req, res) => {
    totalCalendarController.getAllClassStudent(req, res);
});

// get classes for the date in total calendar for teacher
router.get('/classByDateT', authenticateJWT, upload.none(), (req, res) => {
    totalCalendarController.getClassesByDateTeacher(req, res);
});
// get classes for the date in total calendar for student
router.get('/classByDateS', authenticateJWT, upload.none(), (req, res) => {
    totalCalendarController.getClassesByDateStudent(req, res);
});

module.exports = router;
