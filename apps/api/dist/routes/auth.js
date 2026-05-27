import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "@books/db";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
export const authRouter = Router();
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
authRouter.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid login payload" });
        return;
    }
    const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
    }
    const token = jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, { expiresIn: "12h" });
    res.json({ token, user: { id: user.id, email: user.email } });
});
authRouter.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.admin });
});
