const app = require('./api/index');
const express = require('express');

// Serve static frontend files from this directory
app.use(express.static(__dirname));

const port = process.env.PORT || 5001;

app.listen(port, () => {
    console.log(`Local development server running on port ${port}`);
    console.log(`Open http://localhost:${port} in your browser to view the Admin Dashboard.`);
});
