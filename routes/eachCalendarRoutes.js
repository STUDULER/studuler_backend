const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const eachCalendarController = require('../controllers/eachCalendarController');
const { authenticateJWT } = require('../jwt/auth');

router.get('/calendarT', authenticateJWT, (req, res) => {
    eachCalendarController.getEachCalendarTeacher(req, res);
});
router.get('/calendarS', authenticateJWT, (req, res) => {
    eachCalendarController.getEachCalendarStudent(req, res);
});

router.get('/feedbackByDateT', authenticateJWT, (req, res) => {
    eachCalendarController.getFeedbackByDateTeacher(req, res);
});
router.get('/feedbackByDateS', authenticateJWT, (req, res) => {
    eachCalendarController.getFeedbackByDateStudent(req, res);
});

router.post('/createFeedback', authenticateJWT, upload.none(), (req, res) => {
    eachCalendarController.createFeedback(req, res);
});
router.put('/editFeedback', authenticateJWT, upload.none(), (req, res) => {
    eachCalendarController.editFeedback(req, res);
});

router.put('/deleteLesson', authenticateJWT, upload.none(), (req, res) => {
    eachCalendarController.deleteLesson(req, res);
});
router.post('/addLesson', authenticateJWT, upload.none(), (req, res) => {
    eachCalendarController.addNewLesson(req, res);
});

router.get('/prevLastDate', authenticateJWT, upload.none(), (req, res) => {
    eachCalendarController.getLastDateOfPrevious(req, res);
});

module.exports = router;
