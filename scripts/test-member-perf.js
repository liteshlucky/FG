
const apiEndpoint = 'http://localhost:3000/api/members';

async function measurePerformance() {
    console.log('Starting performance test...');
    const start = performance.now();

    try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        const end = performance.now();
        console.log(`API Call took ${(end - start).toFixed(2)}ms`);
        console.log(`Fetched ${data.data.length} members`);

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

measurePerformance();
