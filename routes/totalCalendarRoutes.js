const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const totalCalendarController = require('../controllers/totalCalendarController');
const authenticateJWT = require('../jwt/auth');

router.get('/', totalCalendarController.getClassesid);
router.get('/totalCalendar', (req, res) => {
//router.get('/totalCalendar', authenticateJWT, (req, res) => {
    if (req.role === 'teacher'){
        totalCalendarController.getAllClassTeacher(req, res);
    }
    else if(req.role === 'student'){
        totalCalendarController.getAllClassStudent(req, res);
    }
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
