require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve all your HTML/CSS/JS/images as static files
app.use(express.static(path.join(__dirname, "public")));

// ─── DATABASE ─────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// ─── EMAIL ────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ─── CONTACT FORM ─────────────────────────────────────────────────────────────
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ message: "All fields are required." });

  const mailOptions = {
    from: `"Shavinder NEF Site" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    replyTo: email,
    subject: `New message from ${name} — Shavinder NEF`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0e0e0e;color:#f0ece4;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <div style="background:#c0392b;padding:28px 36px;">
          <p style="margin:0;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.7);">New Contact Message</p>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;color:#fff;">Shavinder NEF</h1>
        </div>
        <div style="padding:36px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#888;font-size:12px;letter-spacing:2px;text-transform:uppercase;width:90px;">From</td>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#f0ece4;font-size:15px;">${name}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#888;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Email</td>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-size:15px;"><a href="mailto:${email}" style="color:#2a9d8f;">${email}</a></td>
            </tr>
          </table>
          <p style="color:#888;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Message</p>
          <div style="background:#1a1a1a;border-left:3px solid #c0392b;border-radius:4px;padding:20px 24px;">
            <p style="margin:0;font-size:16px;line-height:1.8;color:#d0ccc4;">${message.replace(/\n/g, "<br>")}</p>
          </div>
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.07);">
            <a href="mailto:${email}" style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:600;letter-spacing:1px;">Reply to ${name}</a>
          </div>
        </div>
        <div style="padding:20px 36px;background:#080808;text-align:center;">
          <p style="margin:0;color:#444;font-size:11px;letter-spacing:2px;text-transform:uppercase;">shavinder-nef · Wildlife Photography</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Message sent!" });
  } catch (err) {
    console.error("Email Error:", err);
    res.status(500).json({ message: "Failed to send message." });
  }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post("/api/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  const userRole = role || "Customer";
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
      [name, email, hashedPassword, userRole],
    );
    res.status(200).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Signup Error:", err);
    if (err.code === "23505")
      res.status(400).json({ message: "Email already exists" });
    else res.status(500).json({ message: "Error creating user" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT user_id, name, password_hash, role FROM users WHERE email = $1`,
      [email],
    );
    if (result.rows.length === 0)
      return res.status(401).json({ message: "Invalid email or password" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (match) {
      res.status(200).json({
        message: "Login successful",
        user: { id: user.user_id, name: user.name, email, role: user.role },
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Error logging in" });
  }
});

// ─── CHECKOUT ─────────────────────────────────────────────────────────────────
app.post("/api/checkout", async (req, res) => {
  const { userId, name, email, address, cart } = req.body;
  try {
    for (const item of cart) {
      await pool.query(
        `INSERT INTO print_orders (user_id, image_url, customer_name, customer_email, print_size, paper_finish, shipping_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, item.imageUrl, name, email, item.size, item.finish, address],
      );
    }
    res.status(200).json({ message: "Checkout successful!" });
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ message: "Error processing checkout" });
  }
});

// ─── ORDERS (admin) ───────────────────────────────────────────────────────────
app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM print_orders ORDER BY order_date DESC`,
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Fetch Orders Error:", err);
    res.status(500).send("Error fetching orders");
  }
});

// ─── MY ORDERS ────────────────────────────────────────────────────────────────
app.get("/api/my-orders/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM print_orders WHERE user_id = $1 ORDER BY order_date DESC`,
      [req.params.userId],
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Fetch History Error:", err);
    res.status(500).send("Error fetching order history");
  }
});

// ─── CATCH-ALL (SPA fallback) ─────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
