import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(env.port, "127.0.0.1", () => {
      console.log(`CONG backend running on http://127.0.0.1:${env.port}`);
    });
  } catch {
    console.error("Failed to start CONG backend");
    process.exit(1);
  }
}

void startServer();
