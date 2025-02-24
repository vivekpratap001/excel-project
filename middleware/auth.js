exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        // console.log('jdm',  req.session.user)
        return next();
    } else   {
        return res.redirect('/users/login');
    }
  };
  

