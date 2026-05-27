import "dotenv/config";
export const config = {
    port: Number(process.env.PORT ?? 4000),
    jwtSecret: requireEnv("JWT_SECRET"),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
};
function requireEnv(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing required environment variable: ${name}`);
    return value;
}
