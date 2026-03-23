require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const fantasyRoutes = require("./routes/fantasy");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/fantasy", fantasyRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", authenticated: !!req.session.accessToken });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏈 Fantasy League AI running on http://localhost:${PORT}`);
  if (!process.env.YAHOO_CLIENT_ID) {
    console.warn("⚠️  YAHOO_CLIENT_ID not set. Copy .env.example to .env\n");
  }
});
