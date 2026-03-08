const http = require('http');

const API_URL = 'http://localhost:4010/api';

async function testSurrogates() {
    try {
        console.log('--- Testing Multi-Tenant Surrogates ---');

        // 1. Login to get a token
        console.log('1. Logging in as admin@nitro.com...');
        const loginReq = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@nitro.com',
                password: 'admin123', // Default seeded password
                tenant: 'landlord'
            })
        });

        if (!loginReq.ok) {
            console.error('Login failed:', await loginReq.text());
            return;
        }

        const loginData = await loginReq.json();
        const token = loginData.access_token;
        console.log('Login successful.');

        // 2. Request 'client' surrogate (should lazy initialize and return CLI-0001)
        console.log('\n2. Requesting next "client" surrogate...');
        const surrogateReq = await fetch(`${API_URL}/surrogates/client/next`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant': 'landlord'
            }
        });

        if (!surrogateReq.ok) {
            console.error('Surrogate request failed:', await surrogateReq.text());
            return;
        }

        const surrogateData = await surrogateReq.json();
        console.log('Surrogate Response:', surrogateData);

        if (surrogateData.next_code === 'CLI-0001') {
            console.log('✅ Success: Lazy initialization worked correctly!');
        } else {
            console.error('❌ Failed: Expected CLI-0001, got', surrogateData.next_code);
        }

    } catch (error) {
        console.error('Error during test:', error);
    }
}

testSurrogates();
