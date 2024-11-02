const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const eachCalendarController = require('../controllers/eachCalendarController');
const authenticateJWT = require('../jwt/auth');

router.get('/eachCalendar', authenticateJWT, (req, res) => {
    if (req.role === 'teacher'){
        eachCalendarController.getEachCalendarTeacher(req, res);
    }
    else if(req.role === 'student'){
        eachCalendarController.getEachCalendarStudent(req, res);
    }
});
router.get('/classByDate', authenticateJWT, (req, res) => {
    if (req.role === 'teacher'){
        eachCalendarController.getFeedbackByDateTeacher(req, res);
    }
    else if(req.role === 'student'){
        eachCalendarController.getFeedbackByDateStudent(req, res);
    }
});

module.exports = router;
