const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001; // porta 3001 para não colidir se o Harmony (3000) estiver aberto
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    const filePath = path.join(BASE_DIR, reqPath);

    if (!filePath.startsWith(BASE_DIR)) {
        res.statusCode = 403;
        res.end('Acesso Negado');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.statusCode = 404;
            res.end('Arquivo nao encontrado: ' + reqPath);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  🌙 JACKAL ATLAS — CENTRAL TÁTICA ATIVA`);
    console.log(`  Mapa:  http://localhost:${PORT}/index.html`);
    console.log(`  Login: http://localhost:${PORT}/login.html`);
    console.log(`  Admin: http://localhost:${PORT}/admin.html`);
    console.log(`======================================================\n`);
});
