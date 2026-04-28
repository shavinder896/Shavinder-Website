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
app.use(express.static(path.join(__dirname, "public")));

// ─── DATABASE ──────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ─── EMAIL ─────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ─── SIGNUP ────────────────────────────────────────────────────────────────
app.post("/api/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const roleResult = await pool.query(
      `SELECT role_id FROM roles WHERE role_name = $1`,
      [role || "Customer"]
    );
    const roleId = roleResult.rows[0]?.role_id || 1;
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role_id) VALUES ($1, $2, $3, $4)`,
      [name, email, hashedPassword, roleId]
    );
    res.status(200).json({ message: "User created successfully" });
  } catch (err) {
    if (err.code === "23505")
      res.status(400).json({ message: "Email already exists" });
    else res.status(500).json({ message: "Error creating user" });
  }
});

// ─── LOGIN ─────────────────────────────────────────────────────────────────
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.name, u.password_hash, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = $1`,
      [email]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ message: "Invalid email or password" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (match) {
      res.status(200).json({
        message: "Login successful",
        user: { id: user.user_id, name: user.name, email, role: user.role_name },
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Error logging in" });
  }
});

// ─── CHECKOUT ──────────────────────────────────────────────────────────────
app.post("/api/checkout", async (req, res) => {
  const { userId, name, email, address, cart } = req.body;
  try {
    for (const item of cart) {
      // Look up IDs from lookup tables
      const sizeResult = await pool.query(
        `SELECT size_id FROM print_sizes WHERE size_label = $1`, [item.size]
      );
      const finishResult = await pool.query(
        `SELECT finish_id FROM paper_finishes WHERE finish_label = $1`, [item.finish]
      );
      const sizeId = sizeResult.rows[0]?.size_id || 1;
      const finishId = finishResult.rows[0]?.finish_id || 1;

      await pool.query(
        `INSERT INTO print_orders
           (user_id, image_url, customer_name, customer_email, size_id, finish_id, shipping_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, item.imageUrl, name, email, sizeId, finishId, address]
      );
    }
    res.status(200).json({ message: "Checkout successful!" });
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ message: "Error processing checkout" });
  }
});

// ─── ALL ORDERS (admin) ────────────────────────────────────────────────────
app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.order_id,
         o.image_url,
         o.customer_name,
         o.customer_email,
         ps.size_label    AS print_size,
         pf.finish_label  AS paper_finish,
         o.shipping_address,
         os.status_label  AS order_status,
         o.order_date
       FROM print_orders o
       JOIN print_sizes    ps ON o.size_id   = ps.size_id
       JOIN paper_finishes pf ON o.finish_id = pf.finish_id
       JOIN order_statuses os ON o.status_id = os.status_id
       ORDER BY o.order_date DESC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Fetch Orders Error:", err);
    res.status(500).send("Error fetching orders");
  }
});

// ─── MY ORDERS ─────────────────────────────────────────────────────────────
app.get("/api/my-orders/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.order_id,
         o.image_url,
         ps.size_label    AS print_size,
         pf.finish_label  AS paper_finish,
         os.status_label  AS order_status,
         o.order_date
       FROM print_orders o
       JOIN print_sizes    ps ON o.size_id   = ps.size_id
       JOIN paper_finishes pf ON o.finish_id = pf.finish_id
       JOIN order_statuses os ON o.status_id = os.status_id
       WHERE o.user_id = $1
       ORDER BY o.order_date DESC`,
      [req.params.userId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Fetch History Error:", err);
    res.status(500).send("Error fetching order history");
  }
});

// ─── CATCH-ALL ─────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
