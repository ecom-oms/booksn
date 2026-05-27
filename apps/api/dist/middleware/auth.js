import jwt from "jsonwebtoken";
import { config } from "../config.js";
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
        res.status(401).json({ message: "Missing auth token" });
        return;
    }
    try {
        req.admin = jwt.verify(token, config.jwtSecret);
        next();
    }
    catch {
        res.status(401).json({ message: "Invalid or expired auth token" });
    }
}
