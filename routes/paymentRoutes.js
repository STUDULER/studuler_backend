const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const paymentController = require('../controllers/paymentController');
const authenticateJWT = require('../jwt/auth');

router.get('/unpaidT', authenticateJWT, (req, res) => {
    paymentController.getUnpaidDatesTeacher(req, res)
});
router.get('/unpaidS', authenticateJWT, (req, res) => {
    paymentController.getUnpaidDatesStudent(req, res)
});

router.get('/nextpayment', authenticateJWT, (req, res) => {
    paymentController.getNextPayment(req, res)
});

router.put('/updateAsPaid', authenticateJWT, (req, res) => {
    paymentController.updateAsPaid(req, res);
});

router.get('/paymentInfo', authenticateJWT, (req, res) => {
    paymentController.getPaymentInfo(req, res)
});

module.exports = router;
