var express = require('express');
const mysql = require('mysql');
const path = require('path');
const xlsx = require('xlsx')
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const session = require('express-session');

// var fileupload = require('express-fileupload');


// Load environment variables
dotenv.config();

var app = express();



// Export the pool for use in other files
// module.exports = pool;
// Middleware

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



app.use(session({
  secret: 'my_secret_key',
  resave: false,  // Prevents session from saving again if no changes
  saveUninitialized: false, // Prevents creating empty sessions
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // Secure in production (HTTPS)
    httpOnly: true,  // Protect against XSS
    maxAge: 24 * 60 * 60 * 1000  // Session expires in 1 day
  }
}));


// app.use(fileupload());

// Routes
const userRoutes = require('./routes/userRoutes');
app.use('/users', userRoutes);

// Home route
app.get('/register', (req, res) => {
  res.render('home');
});


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});