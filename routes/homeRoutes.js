const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const homeController = require('../controllers/homeController');
const authenticateJWT = require('../jwt/auth');

router.get('/', homeController.getClasses);
router.get('/eachClass', authenticateJWT, (req, res) => {
    if (req.role === 'teacher'){
        homeController.getEachClassTeacher(req, res);
    }
    else if(req.role === 'student'){
        homeController.getEachClassStudent(req, res);
    }
});
router.get('/unwrittenFeedbackDates', authenticateJWT, homeController.getUnwrittenFeedbackDates);


module.exports = router;
