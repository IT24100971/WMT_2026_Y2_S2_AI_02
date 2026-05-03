const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2IyOWQzNTA5MzQxOTQ1N2YyYjY2ZCIsImlhdCI6MTczMjMzOTY5MCwiZXhwIjoxNzMyNDI2MDkwfQ.qE3O0J5TJ0TQe63KnIqG70bPDgdIZzn9dwqhWpKhEDk';
const invId = '69e292bf0f3928b6d9f4236e';

const data = JSON.stringify({
  currentStock: 50,
  reorderLevel: 10,
  maxStock: 200,
  warehouseLocation: 'Aisle 5',
  expiryDate: '2025-12-31'
});

const options = {
  hostname: '192.168.8.109',
  port: 5000,
  path: `/api/inventory/${invId}`,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', chunk => responseData += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', responseData.substring(0, 500));
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(data);
req.end();
