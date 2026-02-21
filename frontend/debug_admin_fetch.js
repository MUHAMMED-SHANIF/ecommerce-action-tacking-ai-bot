const fetch = require('node-fetch');

async function testAdminFetch() {
    const adminId = 'admin_user_1768150739848';
    console.log("Testing Admin Fetch with ID:", adminId);

    try {
        const res = await fetch('http://localhost:5001/api/admin/users', {
            headers: { 'x-user-id': adminId }
        });

        console.log("Status:", res.status);
        if (res.ok) {
            const data = await res.json();
            console.log("Data count:", data.length);
            console.log("First user:", data[0]);
        } else {
            console.log("Error body:", await res.text());
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

testAdminFetch();
