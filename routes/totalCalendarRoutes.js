const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const totalCalendarController = require('../controllers/totalCalendarController');
const authenticateJWT = require('../jwt/auth');

router.get('/', totalCalendarController.getClasses);
router.get('/totalCalendar', authenticateJWT, (req, res) => {
    if (req.role === 'teacher'){
        totalCalendarController.getAllClassTeacher
    }
    else if(req.role === 'student'){
        totalCalendarController.getAllClassStudent
    }
});
router.get('/classByDate', authenticateJWT, (req, res) => {
    if (req.role === 'teacher'){
        totalCalendarController.getClassesByDateTeacher
    }
    else if(req.role === 'student'){
        totalCalendarController.getClassesByDateTeacher
    }
});

module.exports = router;
