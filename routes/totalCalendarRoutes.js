const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const totalCalendarController = require('../controllers/totalCalendarController');
const authenticateJWT = require('../jwt/auth');

router.get('/', totalCalendarController.getClassesid);

// get classes information for total calendar for teacher
router.get('/calendarT', authenticateJWT, (req, res) => {
    totalCalendarController.getAllClassTeacher(req, res);
});
// get classes information for total calendar for teacher
router.get('/calendarS', authenticateJWT, (req, res) => {
    totalCalendarController.getAllClassStudent(req, res);
});

router.get('/classByDate', authenticateJWT, (req, res) => {
    if (req.role === 'teacher'){
        totalCalendarController.getClassesByDateTeacher(req, res);
    }
    else if(req.role === 'student'){
        totalCalendarController.getClassesByDateStudent(req, res);
    }
});

module.exports = router;
