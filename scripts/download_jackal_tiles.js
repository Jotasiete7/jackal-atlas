const fs = require('fs');
const path = require('path');
const https = require('https');

// Tenta carregar sharp do diretório vizinho se não estiver no atual
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    try {
        sharp = require(path.join(__dirname, '..', '..', 'Guilda-Harmony-Sistems', 'node_modules', 'sharp'));
    } catch (err) {
        console.warn('[-] Sharp não encontrado, montagem da imagem única 4096x4096px será ignorada.');
    }
}

const BASE_URL = 'https://wurmmaps.xyz/Jackal/tiles';
const OUTPUT_ROOT = path.join(__dirname, '..');

const LAYERS = [
    { name: 'terrain', suffix: '-terrain.png', folder: 'tiles_terrain' },
    { name: 'topo',    suffix: '-topo.png',    folder: 'tiles_topo' },
    { name: 'iso',     suffix: '-iso.png',     folder: 'tiles_iso' }
];

const MAX_ZOOM = 4;
const CONCURRENCY = 6;

function downloadTile(url, destPath) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
            return resolve(false); // Já existe
        }

        const dir = path.dirname(destPath);
        fs.mkdirSync(dir, { recursive: true });

        const file = fs.createWriteStream(destPath);
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        }, (res) => {
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(destPath, () => {});
                return reject(new Error(`HTTP ${res.statusCode} para ${url}`));
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(true));
            });
        });

        req.on('error', (err) => {
            file.close();
            fs.unlink(destPath, () => {});
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            file.close();
            fs.unlink(destPath, () => {});
            reject(new Error(`Timeout para ${url}`));
        });
    });
}

async function runQueue(tasks, concurrency) {
    let index = 0;
    let completed = 0;
    const total = tasks.length;

    async function worker() {
        while (index < tasks.length) {
            const task = tasks[index++];
            let success = false;
            let retries = 3;

            while (!success && retries > 0) {
                try {
                    await downloadTile(task.url, task.destPath);
                    success = true;
                } catch (e) {
                    retries--;
                    if (retries === 0) {
                        console.error(`[-] Falha ao baixar ${task.url}: ${e.message}`);
                    } else {
                        await new Promise(r => setTimeout(r, 800));
                    }
                }
            }

            completed++;
            if (completed % 25 === 0 || completed === total) {
                process.stdout.write(`\r    Progresso: ${completed}/${total} tiles (${Math.round(completed / total * 100)}%)`);
            }
        }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    console.log('');
}

async function buildCompositeImage(layerFolder, outputImageName) {
    if (!sharp) return;

    console.log(`\n[+] Montando imagem composta de alta resolução 4096x4096px (${outputImageName})...`);
    const z = 4;
    const tilesPerAxis = 16;
    const tileSize = 256;
    const composites = [];

    for (let x = 0; x < tilesPerAxis; x++) {
        for (let y = 0; y < tilesPerAxis; y++) {
            const tilePath = path.join(OUTPUT_ROOT, layerFolder, String(z), String(x), `${y}.png`);
            if (fs.existsSync(tilePath)) {
                composites.push({
                    input: tilePath,
                    left: x * tileSize,
                    top: y * tileSize
                });
            }
        }
    }

    if (composites.length === 0) {
        console.warn('[-] Nenhum tile encontrado no Zoom 4 para compor.');
        return;
    }

    const outputPath = path.join(OUTPUT_ROOT, outputImageName);
    await sharp({
        create: {
            width: 4096,
            height: 4096,
            channels: 4,
            background: { r: 6, g: 7, b: 9, alpha: 1 }
        }
    })
    .composite(composites)
    .png({ compressionLevel: 8 })
    .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`[✓] Imagem composta gerada com sucesso: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function main() {
    console.log('========================================================');
    console.log('  🌙 EXTRAÇÃO DO MAPA OFICIAL DE JACKAL (WURMMAPS.XYZ)');
    console.log('========================================================\n');

    for (const layer of LAYERS) {
        console.log(`[+] Processando camada: ${layer.name.toUpperCase()} (${layer.folder})...`);
        const tasks = [];

        for (let z = 0; z <= MAX_ZOOM; z++) {
            const tilesPerAxis = Math.pow(2, z);
            for (let x = 0; x < tilesPerAxis; x++) {
                for (let y = 0; y < tilesPerAxis; y++) {
                    const url = `${BASE_URL}/${z}/${x}/${y}${layer.suffix}`;
                    // Salvar no formato Leaflet canônico: folder/z/x/y.png
                    const destPath = path.join(OUTPUT_ROOT, layer.folder, String(z), String(x), `${y}.png`);
                    tasks.push({ url, destPath });
                }
            }
        }

        console.log(`    Total de tiles a verificar/baixar: ${tasks.length}`);
        await runQueue(tasks, CONCURRENCY);
    }

    // Gerar a imagem composta 4096x4096px do terreno
    try {
        await buildCompositeImage('tiles_terrain', 'jackal_original_terrain_4096.png');
    } catch (err) {
        console.error('[-] Erro ao montar imagem composta:', err);
    }

    console.log('\n[✓] EXTRAÇÃO CONCLUÍDA COM SUCESSO!');
}

main();
