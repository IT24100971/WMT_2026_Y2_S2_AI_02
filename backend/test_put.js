const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2IyOWQzNTA5MzQxOTQ1N2YyYjY2ZCIsImlhdCI6MTczMjMzOTY5MCwiZXhwIjoxNzMyNDI2MDkwfQ.qE3O0J5TJ0TQe63KnIqG70bPDgdIZzn9dwqhWpKhEDk';
const invId = '69e292bf0f3928b6d9f4236e';

axios.put(`http://192.168.8.109:5000/api/inventory/${invId}`, 
  { currentStock: 99 },
  { headers: { 'Authorization': `Bearer ${token}` } }
).then(resp => {
  console.log('Success!');
  console.log('Status:', resp.status);
  console.log('Data:', resp.data);
}).catch(err => {
  console.log('Error:', err.response?.status, err.response?.statusText);
  console.log('Data:', err.response?.data);
  if (err.response?.data && typeof err.response.data === 'string') {
    console.log('Raw:', err.response.data.substring(0, 500));
  }
});
