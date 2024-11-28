const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
const initializeDatabase = require("./config/dbInit");
const authRoutes = require("./routes/auth.routes");
const itemRoutes = require("./routes/items.routes");
const userRoutes = require("./routes/users.routes");
const transactionRoutes = require("./routes/transactions.routes");
const messageRoutes = require("./routes/messages.routes");
const eventRoutes = require("./routes/events.routes");
const paymentRoutes = require('./routes/payment.routes');
const db = require("./config/database");

const app = express();

app.use(
  cors({
    origin: "*", // Must change this later when we get our front-end domain
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan("dev"));

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.send("Toga backend server is running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/payments", paymentRoutes)

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "**ERROR** Something went wrong with the server!" });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Initialize database tables and seed data
    await initializeDatabase();
    console.log("Database initialized successfully");

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
