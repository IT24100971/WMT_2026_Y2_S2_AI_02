const jwt = require('jsonwebtoken');
const protect = async (req, res, next) => {
  let token;

  // 1. Check if the Authorization header exists and starts with Bearer
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 2. Extract the token[cite: 1]
      token = req.headers.authorization.split(' ')[1];

      // 3. Verify the token[cite: 1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. CRITICAL FIX: Map the ID correctly
      // We map the decoded 'id' to both 'id' and '_id' so the controller 
      // always finds what it's looking for.
      req.user = { 
        ...decoded, 
        _id: decoded.id, 
        id: decoded.id 
      };

      // 5. Proceed to the controller
      return next(); 
      
    } catch (error) {
      console.error("JWT Verification Error:", error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // 6. Handle cases where no token is provided[cite: 1]
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  // Check if the user object exists and has the Admin role[cite: 1]
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied for this role' });
  }
  next();
};

module.exports = { protect, adminOnly, allowRoles };