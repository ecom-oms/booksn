import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { exportRouter } from "./routes/exports.js";
import { inventoryRouter } from "./routes/inventory.js";
import { publisherRouter } from "./routes/publishers.js";
import { uploadRouter } from "./routes/uploads.js";
import { config } from "./config.js";

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 300 }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/inventory", inventoryRouter);
app.use("/exports", exportRouter);
app.use("/uploads", uploadRouter);
app.use("/publishers", publisherRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`Inventory API listening on :${config.port}`);
});
