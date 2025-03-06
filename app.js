const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const session = require('express-session');

// Load environment variables early
dotenv.config();

// Import Sequelize connection & models
const { sequelize } = require("./model/connection");
const UserData = require("./model/user");
const Leadsample = require("./model/leadfile");

// Initialize Express app
const app = express();

// Middleware Setup

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'my_secret_key', // Use an env variable for security
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Secure only in production (HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day expiration
  }
}));

// Ensure database sync before starting server
(async () => {
  try {
    await sequelize.sync({ force: false });
    console.log("Database & tables synced!");

    // Start the server only after DB sync
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Database sync error:", err);
  }
})();

// Routes
const userRoutes = require('./routes/userRoutes');
app.use('/users', userRoutes);

// Home route
app.get('/register', (req, res) => {
  res.render('home');
});
