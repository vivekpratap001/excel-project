// routes.js
const express = require('express');
const router = express.Router();

// Import controllers and utilities
const userController = require('../controllers/userController');
// const sendMail = require('../utils/sendmail');
const {upload} = require('../middleware/upload');
const { isAuthenticated } = require('../middleware/auth'); 
 

// Define routes

router.post('/users' ,userController.AllUsers);
// router.get('/fetch-user', userController.fetchUser);
router.get('/login',  userController.loginpage);
router.post('/login_user',  userController.login);
router.get('/dashboard', isAuthenticated, userController.dashboard);
router.post('/upload',  upload.single('file'), userController.upload)
router.get('/tables',isAuthenticated, userController.tables)
router.post('/delete', userController.delete);
router.post('/logout', userController.logout)
router.get('/detail' ,isAuthenticated, userController.detail)
// router.get('/search', userController.search)
router.post('/update', userController.update)
router.post('/sendEmail', userController.sendEmail)


module.exports = router;


