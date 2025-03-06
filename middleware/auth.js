exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user && req.session.id) {
        // console.log('jdm',  req.session.id)
        return next();
    } else   {
        return res.redirect('/users/login');
    }
  };
  
  exports.isAdmin = async (req, res, next) => {
    try {
        if (!req.session.user || req.session.user.role !== "Admin") {
            return res.redirect('/users/userview'); // Redirect if not logged in or not admin
        }
        next(); // Allow access if the user is admin
    } 
    catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
}; 
