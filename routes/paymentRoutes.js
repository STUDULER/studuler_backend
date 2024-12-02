const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const paymentController = require('../controllers/paymentController');
const authenticateJWT = require('../jwt/auth');

router.get('/unpaid', authenticateJWT, (req, res) => {
    paymentController.getUnpaidDates(req, res)
});
router.get('/nextpayment', authenticateJWT, (req, res) => {
    paymentController.getNextPayment(req, res)
});

module.exports = router;
