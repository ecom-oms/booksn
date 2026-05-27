import bcrypt from "bcryptjs";
import { prisma } from "@books/db";
import { config } from "../config.js";
export async function bootstrapAdmin() {
    if (!config.adminEmail || !config.adminPassword)
        return;
    const existing = await prisma.adminUser.findUnique({ where: { email: config.adminEmail } });
    if (existing)
        return;
    await prisma.adminUser.create({
        data: {
            email: config.adminEmail,
            passwordHash: await bcrypt.hash(config.adminPassword, 12),
        },
    });
    console.log(`Bootstrapped admin user ${config.adminEmail}`);
}
