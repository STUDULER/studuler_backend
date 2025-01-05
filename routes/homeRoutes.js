const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const homeController = require('../controllers/homeController');
const authenticateJWT = require('../jwt/auth');

// get all classes
router.get('/', homeController.getClasses);

// get classid, classname, and themecolor based on the userId
router.get('/classIdT', authenticateJWT, (req, res) => {
    homeController.getClassIdT(req, res);
});
router.get('/classIdS', authenticateJWT, (req, res) => {
    homeController.getClassIdS(req, res);
});

// get classes information participated by the user
router.get('/eachClassT', authenticateJWT, (req, res) => {
    homeController.getEachClassTeacher(req, res);
});
router.get('/eachClassS', authenticateJWT, (req, res) => {
    homeController.getEachClassStudent(req, res);
});

// create class for teacher
router.post('/createClass', authenticateJWT, upload.none(), (req, res) => {
    console.log('Received data:', req.body);
    homeController.createClassTeacher(req, res);
});
// join class for student
router.put('/joinClass', authenticateJWT, upload.none(), (req, res) => { // should delete upload.none()
    console.log('Received data:', req.body);
    homeController.joinClass(req, res);
});

// modify class info by teacher
router.put('/updateClassT', authenticateJWT, upload.none(), (req, res) => { // should delete upload.none()
    console.log('Received data:', req.body);
    homeController.updateEachClassTeacher(req, res);
});
// modify class info by student
router.put('/updateClassS', authenticateJWT, upload.none(), (req, res) => { // should delete upload.none()
    console.log('Received data:', req.body);
    homeController.updateEachClassStudent(req, res);
});

// get unwritten feedback dates
router.get('/noFeedback', authenticateJWT, upload.none(), (req, res) => {
    homeController.getUnwrittenFeedbackDates(req, res);
});

router.delete('/removeClass', authenticateJWT, (req, res) => {
    homeController.removeClass(req, res);
});

module.exports = router;
