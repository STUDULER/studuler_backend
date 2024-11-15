const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const homeController = require('../controllers/homeController');
const authenticateJWT = require('../jwt/auth');

// get all classes
router.get('/', homeController.getClasses);

// get classes information participated by the user
router.get('/eachClassT', authenticateJWT, (req, res) => {
    homeController.getEachClassTeacher(req, res);
});
router.get('/eachClassS', authenticateJWT, (req, res) => {
    homeController.getEachClassStudent(req, res);
});

// create class for teacher
router.post('/createClass', authenticateJWT, (req, res) => {
    console.log('Received data:', req.body);  // Log the incoming request data
    homeController.createClassTeacher(req, res);
});
// join class for student
router.put('/joinClass', authenticateJWT, upload.none(), (req, res) => { // should delete upload.none()
    console.log('Received data:', req.body);  // Log the incoming request data
    homeController.joinClass(req, res);
});

router.get('/unwrittenFeedbackDates', authenticateJWT, homeController.getUnwrittenFeedbackDates);


module.exports = router;
