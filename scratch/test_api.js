const https = require('https');

https.get('https://kalimatimarket.gov.np/api/daily-prices/en', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('SUCCESS: Read', json.prices?.length, 'items');
            console.log('SAMPLE:', json.prices?.[0]);
        } catch (e) {
            console.log('FAILURE Parsing:', e.message);
            console.log('RAW DATA START:', data.substring(0, 500));
        }
    });
}).on('error', (err) => {
    console.log('FAILURE Connection:', err.message);
});
