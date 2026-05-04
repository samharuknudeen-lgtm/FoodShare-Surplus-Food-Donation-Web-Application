import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

console.log("SERVER BOOTSTRAP - GEMINI_API_KEY starting chars:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : "UNDEFINED");


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("foodshare.db");

// Initialize Database Schema
const initializeSchema = () => {
  console.log("Initializing database schema...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('donor', 'receiver', 'admin')) NOT NULL,
      location TEXT,
      is_verified INTEGER DEFAULT 0,
      verification_status TEXT DEFAULT 'none',
      verification_id_url TEXT,
      verification_face_url TEXT,
      verification_ai_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  try { db.exec("ALTER TABLE users ADD COLUMN verification_face_url TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN verification_ai_reason TEXT;"); } catch (e) {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_id INTEGER NOT NULL,
      food_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'Units',
      remaining_quantity REAL NOT NULL,
      expiry_time TEXT NOT NULL,
      location TEXT NOT NULL,
      lat REAL,
      lng REAL,
      image_url TEXT,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'requested', 'collected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (donor_id) REFERENCES users(id)
    );
  `);
  try { db.exec("ALTER TABLE listings ADD COLUMN unit TEXT DEFAULT 'Units';"); } catch (e) {}
  try { db.exec("ALTER TABLE listings ADD COLUMN remaining_quantity REAL;"); } catch (e) {}
  try { db.exec("UPDATE listings SET remaining_quantity = CAST(quantity AS REAL) WHERE remaining_quantity IS NULL;"); } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'collected', 'cancelled')),
      pickup_time TEXT,
      requested_quantity TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );
  `);

  try { db.exec("ALTER TABLE requests ADD COLUMN requested_quantity TEXT;"); } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    );
  `);

  // Migration: Add lat/lng if they don't exist
  try {
    db.prepare("SELECT lat FROM listings LIMIT 1").get();
  } catch (e) {
    console.log("Migrating listings table: adding lat/lng columns");
    try {
      db.exec("ALTER TABLE listings ADD COLUMN lat REAL");
      db.exec("ALTER TABLE listings ADD COLUMN lng REAL");
    } catch (err) {
      console.log("Listing migration skipped (columns likely exist)");
    }
  }

  // Migration: Add verification columns for existing users
  try {
    db.prepare("SELECT is_verified FROM users LIMIT 1").get();
  } catch (e) {
    console.log("Migrating users table: adding verification columns");
    try {
      db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0");
      db.exec("ALTER TABLE users ADD COLUMN verification_status TEXT DEFAULT 'none'");
      db.exec("ALTER TABLE users ADD COLUMN verification_id_url TEXT");
    } catch (err) {
      console.log("User verification migration skipped");
    }
  }
  
  console.log("Database schema initialized successfully.");

  // Check if admin exists and seed if not
  const adminQuery = db.prepare("SELECT COUNT(*) as count FROM users WHERE email = 'admin@test.com'").get() as any;
  if (adminQuery.count === 0) {
    console.log("Seeding admin user...");
    db.prepare("INSERT INTO users (name, email, password, role, location, is_verified, verification_status) VALUES (?, ?, ?, ?, ?, 1, 'verified')").run(
      "Admin User", "admin@test.com", "password123", "admin", "System"
    );
  }

  // Seed test users if none exist (other than potentially the admin just created)
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  if (userCount.count <= 1) { // 0 users, or 1 user (the admin we just seeded)
    console.log("Seeding test users for Colombo context...");
    db.prepare("INSERT INTO users (name, email, password, role, location) VALUES (?, ?, ?, ?, ?)").run(
      "Test Receiver", "receiver@test.com", "password123", "receiver", "Colombo 03"
    );
    db.prepare("INSERT INTO users (name, email, password, role, location) VALUES (?, ?, ?, ?, ?)").run(
      "Test Donor", "donor@test.com", "password123", "donor", "Gampaha Town"
    );
    
    const donorQuery = db.prepare("SELECT id FROM users WHERE email = 'donor@test.com'").get() as any;
    if (donorQuery) {
        db.prepare("INSERT INTO listings (donor_id, food_type, quantity, unit, remaining_quantity, expiry_time, location, lat, lng, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          donorQuery.id, "Fresh Rice & Curry", 10, "Packs", 10, "Today 8 PM", "Colombo Fort", 6.9344, 79.8428, "available"
        );
        db.prepare("INSERT INTO listings (donor_id, food_type, quantity, unit, remaining_quantity, expiry_time, location, lat, lng, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          donorQuery.id, "Mixed Vegetables", 5, "KG", 5, "Tomorrow Morning", "Gampaha Market", 7.0873, 79.9925, "available"
        );
        db.prepare("INSERT INTO listings (donor_id, food_type, quantity, unit, remaining_quantity, expiry_time, location, lat, lng, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          donorQuery.id, "Bakery Items", 20, "Pieces", 20, "Today 10 PM", "Negombo Road, Wattala", 6.9833, 79.8833, "available"
        );
    }
    console.log("Test data seeded for Sri Lanka context.");
  }
};
initializeSchema();

// Pre-define transactions for better performance and reliability
const createRequestTx = db.transaction((listing_id, receiver_id, pickup_time, requested_quantity) => {
  const reqQty = Number(requested_quantity || 1);
  console.log(`Transaction: Creating request for Listing:${listing_id} by Receiver:${receiver_id} Qty:${reqQty}`);
  
  const listing = db.prepare("SELECT * FROM listings WHERE id = ?").get(listing_id) as any;
  if (!listing) {
    throw new Error(`Listing #${listing_id} not found.`);
  }

  // Handle older records that might have strings or nulls
  const totalQty = parseFloat(String(listing.quantity)) || 0;
  let remaining = (listing.remaining_quantity === null || listing.remaining_quantity === undefined) 
    ? totalQty 
    : parseFloat(String(listing.remaining_quantity));
  
  if (reqQty > remaining) {
    throw new Error(`Requested quantity (${reqQty}) exceeds remaining available (${remaining}).`);
  }

  const receiver = db.prepare("SELECT id FROM users WHERE id = ?").get(receiver_id);
  if (!receiver) {
    throw new Error(`Receiver #${receiver_id} not found.`);
  }

  const insertResult = db.prepare("INSERT INTO requests (listing_id, receiver_id, pickup_time, requested_quantity, status) VALUES (?, ?, ?, ?, 'pending')").run(listing_id, receiver_id, pickup_time, reqQty);
  
  // Update remaining quantity
  const newRemaining = remaining - reqQty;
  const newStatus = newRemaining <= 0 ? 'requested' : 'available';
  
  db.prepare("UPDATE listings SET remaining_quantity = ?, status = ? WHERE id = ?").run(newRemaining, newStatus, listing_id);
  
  return insertResult.lastInsertRowid;
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- Debug API ---
  app.get("/api/debug/db", (req, res) => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const schema: any = {};
    tables.forEach((t: any) => {
      schema[t.name] = db.prepare(`PRAGMA table_info(${t.name})`).all();
    });
    res.json(schema);
  });

  // --- Auth API ---
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, role, location } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (name, email, password, role, location, is_verified, verification_status) VALUES (?, ?, ?, ?, ?, 0, 'none')").run(name, email, password, role, location);
      const user = db.prepare("SELECT id, name, email, role, location, is_verified, verification_status FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.status(201).json(user);
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);
    try {
      const user = db.prepare("SELECT id, name, email, role, location, is_verified, verification_status, verification_id_url FROM users WHERE email = ? AND password = ?").get(email, password);
      if (user) {
        console.log(`Login successful for user: ${email}`);
        res.json(user);
      } else {
        console.log(`Login failed for user: ${email} - Invalid credentials`);
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (err: any) {
      console.error(`Login error for ${email}:`, err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Listings API ---
  app.get("/api/listings", (req, res) => {
    const { status, type, location } = req.query;
    let query = "SELECT l.*, u.name as donor_name, u.is_verified as donor_verified FROM listings l JOIN users u ON l.donor_id = u.id WHERE 1=1";
    const params: any[] = [];

    if (status) {
      query += " AND l.status = ?";
      params.push(status);
    }
    if (type) {
      query += " AND l.food_type LIKE ?";
      params.push(`%${type}%`);
    }
    if (location) {
      query += " AND l.location LIKE ?";
      params.push(`%${location}%`);
    }

    query += " ORDER BY l.created_at DESC";
    const listings = db.prepare(query).all(...params);
    res.json(listings);
  });

  app.post("/api/listings", (req, res) => {
    const { donor_id, food_type, quantity, unit, expiry_time, location, lat, lng, image_url } = req.body;
    const info = db.prepare("INSERT INTO listings (donor_id, food_type, quantity, unit, remaining_quantity, expiry_time, location, lat, lng, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(donor_id, food_type, quantity, unit || 'Units', quantity, expiry_time, location, lat, lng, image_url);
    const listing = db.prepare("SELECT * FROM listings WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(listing);
  });

  app.put("/api/listings/:id", (req, res) => {
    const { id } = req.params;
    const { food_type, quantity, unit, remaining_quantity, expiry_time, location, status } = req.body;
    db.prepare("UPDATE listings SET food_type = ?, quantity = ?, unit = ?, remaining_quantity = ?, expiry_time = ?, location = ?, status = ? WHERE id = ?").run(food_type, quantity, unit || 'Units', remaining_quantity, expiry_time, location, status, id);
    res.json({ message: "Listing updated" });
  });

  app.delete("/api/listings/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM listings WHERE id = ?").run(id);
    res.json({ message: "Listing deleted" });
  });

  // --- Requests API ---
  app.post("/api/requests", (req, res) => {
    const { listing_id, receiver_id, pickup_time, requested_quantity } = req.body;
    console.log("POST /api/requests - Payload:", { listing_id, receiver_id, pickup_time, requested_quantity });
    
    if (!listing_id || !receiver_id || !pickup_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      createRequestTx(Number(listing_id), Number(receiver_id), pickup_time, requested_quantity);
      console.log("Request created successfully");
      res.status(201).json({ message: "Request submitted" });
    } catch (err: any) {
      console.error("Request creation failed:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/requests/receiver/:id", (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, l.food_type, l.location, u.name as donor_name, u.is_verified as donor_verified
      FROM requests r 
      JOIN listings l ON r.listing_id = l.id 
      JOIN users u ON l.donor_id = u.id 
      WHERE r.receiver_id = ?
    `).all(req.params.id);
    res.json(requests);
  });

  app.get("/api/requests/donor/:id", (req, res) => {
    const requests = db.prepare(`
      SELECT r.*, l.food_type, l.location, u.name as receiver_name, u.is_verified as receiver_verified
      FROM requests r 
      JOIN listings l ON r.listing_id = l.id 
      JOIN users u ON r.receiver_id = u.id 
      WHERE l.donor_id = ?
    `).all(req.params.id);
    res.json(requests);
  });

  app.put("/api/requests/:id/confirm", (req, res) => {
    const { id } = req.params;
    db.transaction(() => {
      const request = db.prepare("SELECT listing_id FROM requests WHERE id = ?").get(id) as any;
      db.prepare("UPDATE requests SET status = 'confirmed' WHERE id = ?").run(id);
      db.prepare("UPDATE listings SET status = 'requested' WHERE id = ?").run(request.listing_id);
    })();
    res.json({ message: "Request confirmed" });
  });

  app.put("/api/requests/:id/collect", (req, res) => {
    const { id } = req.params;
    db.transaction(() => {
      const request = db.prepare("SELECT listing_id FROM requests WHERE id = ?").get(id) as any;
      db.prepare("UPDATE requests SET status = 'collected' WHERE id = ?").run(id);
      db.prepare("UPDATE listings SET status = 'collected' WHERE id = ?").run(request.listing_id);
    })();
    res.json({ message: "Food collected" });
  });

  // --- Admin API ---
  app.get("/api/admin/stats", (req, res) => {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const listingCount = db.prepare("SELECT COUNT(*) as count FROM listings").get() as any;
    const collectedCount = db.prepare("SELECT COUNT(*) as count FROM listings WHERE status = 'collected'").get() as any;
    const pendingVerifications = db.prepare("SELECT COUNT(*) as count FROM users WHERE verification_status = 'pending'").get() as any;
    res.json({ 
      users: userCount.count, 
      listings: listingCount.count, 
      collected: collectedCount.count,
      pendingVerifications: pendingVerifications.count 
    });
  });

  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT id, name, email, role, location, is_verified, verification_status, verification_id_url, verification_face_url, verification_ai_reason, created_at FROM users").all();
    res.json(users);
  });

  app.get("/api/debug-env", (req, res) => {
    const key = process.env.GEMINI_API_KEY || "";
    res.json({
        exists: !!process.env.GEMINI_API_KEY,
        length: key.length,
        starts: key.substring(0, 5),
        ends: key.substring(key.length - 5)
    });
  });

  app.put("/api/admin/users/:id/verify", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'verified' or 'rejected'
    const isVerified = status === 'verified' ? 1 : 0;
    db.prepare("UPDATE users SET is_verified = ?, verification_status = ? WHERE id = ?").run(isVerified, status, id);
    res.json({ message: "User verification status updated" });
  });

  app.delete("/api/admin/users/:id", (req, res) => {
    const { id } = req.params;
    db.transaction(() => {
      db.prepare("DELETE FROM requests WHERE receiver_id = ?").run(id);
      db.prepare("DELETE FROM requests WHERE listing_id IN (SELECT id FROM listings WHERE donor_id = ?)").run(id);
      db.prepare("DELETE FROM listings WHERE donor_id = ?").run(id);
      db.prepare("DELETE FROM feedback WHERE from_user_id = ? OR to_user_id = ?").run(id, id);
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
    })();
    res.json({ message: "User securely deleted" });
  });

  // --- User Verification API ---
  app.post("/api/users/:id/request-verification", (req, res) => {
    const { id } = req.params;
    const { id_url, face_url, ai_reason } = req.body;
    try {
      db.prepare("UPDATE users SET verification_status = 'pending', verification_id_url = ?, verification_face_url = ?, verification_ai_reason = ? WHERE id = ?").run(id_url, face_url, ai_reason || 'AI Match Verified', id);
      const user = db.prepare("SELECT id, name, email, role, location, is_verified, verification_status, verification_id_url, verification_face_url, verification_ai_reason FROM users WHERE id = ?").get(id);
      res.json(user);
    } catch (err: any) {
      console.error("Verification request failed:", err);
      res.status(500).json({ error: "Failed to process verification request" });
    }
  });

  // --- Feedback API ---
  app.post("/api/feedback", (req, res) => {
    const { from_user_id, to_user_id, rating, comment } = req.body;
    db.prepare("INSERT INTO feedback (from_user_id, to_user_id, rating, comment) VALUES (?, ?, ?, ?)").run(from_user_id, to_user_id, rating, comment);
    res.status(201).json({ message: "Feedback submitted" });
  });

  // Separate AI verification endpoint
  app.post("/api/verify-identity", async (req, res) => {
    const { idImage, selfieImage } = req.body;
    
    let apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
        apiKey = apiKey.slice(1, -1);
    }
    apiKey = apiKey.trim();

    if (apiKey === 'MY_GEMINI_API_KEY' || !apiKey || apiKey === 'undefined') {
      console.warn("AI BYPASS MODE: No valid API key found. Simulating success for manual admin review.");
      return res.json({
        isMatch: true,
        isLive: true,
        confidenceScore: 1.0, 
        reason: "SIMULATED_SUCCESS_NO_API_KEY"
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const idPart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: idImage.split(',')[1],
        },
      };
      const selfiePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: selfieImage.split(',')[1],
        },
      };
      
      const prompt = `
        Analyze these two images for identity verification:
        1. An ID document scan/photo.
        2. A live selfie of the person.
        
        Tasks:
        - Face Match: Does the person in the selfie match the ID?
        - Liveliness: Is the selfie a real person (not a photo of a photo)?
        - Document Verification: Is the ID a legitimate document (NIC/Passport/License)?
        
        Return JSON:
        {
          "isMatch": boolean,
          "isLive": boolean,
          "confidenceScore": number (0-1),
          "reason": string
        }
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [idPart, selfiePart, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
        }
      });

      const verificationResult = JSON.parse(result.text || "{}");
      res.json(verificationResult);
    } catch (err: any) {
      console.error("Server-side AI verification failed:", err);
      
      let friendlyError = "AI verification service failed";
      let details = err.message;
      
      if (err.message && err.message.includes("API_KEY_INVALID")) {
        friendlyError = "Invalid API Key Detected";
        details = "Your configured GEMINI_API_KEY is invalid and was rejected by Google. Please open the AI Studio UI, go to Settings > Secrets, and DELETE the GEMINI_API_KEY secret entirely to use the system default, or replace it with a valid key.";
      }
      
      res.status(500).json({ error: friendlyError, details: details });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
