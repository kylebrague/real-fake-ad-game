// write a simple node server to host the game
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve static files from the dist directory
app.use(
  express.static(path.join(__dirname, "/dist"), {
    extensions: ["html"],
  })
);

app.listen(port, (args) => {
  if(args){
    console.error("Error starting server:", args);
    return;
  }
  console.log(`Server running at http://localhost:${port}/`);
});
