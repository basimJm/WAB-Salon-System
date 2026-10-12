const express = require('express');
const router = express.Router();
const customerModule = require('../modules/customer');
const merchantModule = require('../modules/merchant');
const adminModule = require('../modules/admin');
const sharedModule = require('../modules/shared');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'WAB Server is running' });
});

router.use('/v1/customer', customerModule.routes);
router.use('/v1/merchant', merchantModule.routes);
router.use('/v1/admin', adminModule.routes);
router.use('/v1/notifications', sharedModule.routes);

module.exports = router;
