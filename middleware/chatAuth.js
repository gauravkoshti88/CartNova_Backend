import jwt from "jsonwebtoken";

export const chatAuth = (req, res, next) => {
  try {
    const userToken = req.cookies?.userToken;

    const adminToken = req.cookies?.adminToken;

    if (userToken) {
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET);

      if (!decoded?.userId) {
        return res.status(401).json({
          success: false,
          message: "Invalid user token",
        });
      }

      req.chatUser = {
        type: "user",
        id: decoded.userId,
      };

      return next();
    }

    if (adminToken) {
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);

      if (!decoded?.adminId) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin token",
        });
      }

      req.chatUser = {
        type: "admin",
        id: decoded.adminId,
      };

      return next();
    }

    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  } catch (error) {
    console.error("CHAT AUTH ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Chat authentication failed",
    });
  }
};
