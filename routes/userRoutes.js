// routes.js
const express = require('express');
const router = express.Router();

// Import controllers and utilities
const userController = require('../controllers/userController');
// const sendMail = require('../utils/sendmail');
const {upload} = require('../middleware/upload');
const { isAuthenticated } = require('../middleware/auth'); 
// const{isAdmin} = require('../middleware/auth');
 

// Define routes

router.post('/users' ,userController.AllUsers);
// router.get('/fetch-user', userController.fetchUser);
router.get('/login',  userController.loginpage);
router.post('/login_user',  userController.login);
router.get('/dashboard', isAuthenticated, userController.dashboard);
router.post('/upload',  upload.single('file'), userController.upload)
router.get('/tables', isAuthenticated, userController.tables)
router.post('/delete',isAuthenticated, userController.delete);
router.post('/logout',isAuthenticated, userController.logout)
router.get('/detail' ,isAuthenticated, userController.detail)
// router.get('/search', userController.search)
router.post('/update',isAuthenticated, userController.update)
router.post('/sendEmail',isAuthenticated, userController.sendEmail)
router.get('/users_list', isAuthenticated, userController.userlist)
router.get('/adduser' , isAuthenticated, userController.adduser)
router.post('/signup', isAuthenticated, userController.signup_user)
router.post('/userdelete', isAuthenticated, userController.userdelete);
router.get('/userdetail', userController.userdetail)
router.post('/userupdate',  isAuthenticated, userController.userupdate)
router.get('/userview',   userController.usersview)

module.exports = router;


