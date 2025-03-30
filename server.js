const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

// Map file extensions to MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  // Parse URL and extract pathname
  const parsedUrl = parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // If path is '/', serve index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Get absolute path to requested file
  const filePath = path.join(process.cwd(), pathname);
  
  // Determine content type based on file extension
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  // Read and serve the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // If we can't find the requested file, serve index.html for client-side routing
        fs.readFile(path.join(process.cwd(), 'index.html'), (error, content) => {
          if (error) {
            res.writeHead(500);
            res.end('Server Error');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Successful response
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});