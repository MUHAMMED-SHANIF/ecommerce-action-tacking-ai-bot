const urls = [
    'http://localhost:5001/api/products',
    'http://localhost:5001/api/home-layout',
    'http://localhost:5001/api/banners',
    'http://localhost:5001/api/admin/categories'
];

async function run() {
    const results = {};
    for (const url of urls) {
        try {
            const res = await fetch(url);
            const text = await res.text();
            results[url] = { status: res.status, text: text.substring(0, 200) };
        } catch (err) {
            results[url] = { error: err.message };
        }
    }
    console.log(JSON.stringify(results, null, 2));
}

run();
