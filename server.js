// write a simple node server to host the game
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const defaultPort = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV !== "production";

// Check if index.html exists, if not create a basic one
const distDir = path.join(__dirname, "/dist");
const indexPath = path.join(distDir, "index.html");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

if (!fs.existsSync(indexPath)) {
  const basicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Real Fake Ad Game</title>
  <style>
    body { margin: 0; overflow: hidden; background-color: #f0f0f0; }
    canvas { display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script src="/scripts/index.js"></script>
</body>
</html>`;
  fs.writeFileSync(indexPath, basicHtml);
  console.log("Created basic index.html in dist directory");
}

// Make sure scripts directory exists
const scriptsDir = path.join(distDir, "scripts");
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
  console.log("Created scripts directory in dist");
}

// Middleware to add CORS headers in development
if (isDevelopment) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
}

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, "dist")));

// Fallback route for SPA - must come after static routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).send("Something went wrong!");
});

// Function to find an available port
const startServer = (port) => {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`Port ${port} is already in use, trying ${port + 1}...`);
        resolve(startServer(port + 1));
      } else {
        reject(err);
      }
    });
    
    server.on("listening", () => {
      const actualPort = server.address().port;
      console.log(`
🎮 Game server running at http://localhost:${actualPort}/
${isDevelopment ? "🔧 Development mode enabled" : "🚀 Production mode"}
      `);
      resolve(server);
    });
    
    server.listen(port);
  });
};

// Start the server with automatic port selection
startServer(defaultPort).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

// Handle shutdown gracefully
process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  process.exit(0);
});
