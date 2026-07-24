import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.config.js";

connectDb();

const PORT = env.PORT || 5000;
app.listen(PORT, console.log("Server is Running..."));
