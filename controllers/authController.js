const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  try {
    // Get the token from the cookies
    const token = req.cookies.authToken; // Assuming 'authToken' is the cookie name
    // console.log("the token:" + token);
    // Check if the token exists
    if (!token) {
      return res.redirect("/login"); // Redirect if no token is found in the cookies
    }

    // Verify the token using your JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user information (userId) to the request object
    req.user = { userId: decoded.userId };
    // console.log("the looged in user", req.user);

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);

    // Redirect to login if the token is invalid or expired
    return res.redirect("/login");
  }
};
