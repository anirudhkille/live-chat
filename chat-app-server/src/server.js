import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.config.js";

connectDb();

const PORT = env.PORT || 8080;
app.listen(PORT, console.log("Server is Running..."));
