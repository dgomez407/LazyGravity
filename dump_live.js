const { CDP_DEBUG_PORT = 9222 } = process.env;

(async () => {
    try {
        const http = require('http');
        
        const listRes = await new Promise((resolve, reject) => {
            http.get(`http://127.0.0.1:${CDP_DEBUG_PORT}/json/list`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });
        const idePage = listRes.find(p => p.url.includes('workbench.html'));
        if (!idePage) throw new Error("IDE page not found");

        const puppeteer = require('puppeteer-core');
        const browser = await puppeteer.connect({ browserWSEndpoint: idePage.webSocketDebuggerUrl });
        const targets = await browser.targets();
        
        const fs = require('fs');
        let idx = 0;
        for (const target of targets) {
            try {
                if (target.type() === 'page' || target.type() === 'iframe') {
                    const page = await target.page();
                    if (page) {
                        const html = await page.evaluate(() => document.body.innerHTML);
                        fs.writeFileSync(`dom_dump_${idx}.html`, html);
                        console.log(`Dumped target ${idx} (${target.url()})`);
                        idx++;
                    }
                }
            } catch (e) {
                console.log(`Failed to dump target ${idx}: ${e.message}`);
                idx++;
            }
        }

        await browser.disconnect();
    } catch(e) {
        console.error(e);
    }
})();
