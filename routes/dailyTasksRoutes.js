const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const dailyTasksController = require('../controllers/dailyTasks');

router.post('/debug', (req, res) => {
    dailyTasksController.debugNextDates(req, res)
});

module.exports = router;