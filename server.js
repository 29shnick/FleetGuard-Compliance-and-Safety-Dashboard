import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
// Azure dynamically assigns a port via process.env.PORT
const port = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the static files from the Vite build directory 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

// Support React SPA routing by routing all traffic to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`FleetGuard Dashboard server running on port ${port}`);
});
