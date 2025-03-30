const express = require('express');
const router = express.Router();
const { submitContactForm } = require('../controllers/contactController');

// Submit contact form
router.post('/submit', submitContactForm);

module.exports = router; 