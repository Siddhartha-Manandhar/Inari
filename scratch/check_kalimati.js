const https = require('https');

function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function checkSource() {
    try {
        const html = await fetchHtml('https://kalimatimarket.gov.np/');
        console.log("HTML Length:", html.length);
        const searchStr = 'संकलित दैनिक मूल्यहरु';
        const index = html.indexOf(searchStr);
        if (index !== -1) {
            console.log("Found at index:", index);
            console.log(html.substring(index, index + 3000));
        } else {
            console.log("Not found in raw HTML. Let's try /price page.");
            const priceHtml = await fetchHtml('https://kalimatimarket.gov.np/price');
            const pIndex = priceHtml.indexOf('कृषि उपज');
            if (pIndex !== -1) {
                 console.log("Found on /price page at index:", pIndex);
                 console.log(priceHtml.substring(pIndex, pIndex + 3000));
            } else {
                console.log("Table not found on /price either.");
            }
        }
    } catch (e) {
        console.error(e);
    }
}

checkSource();
