const fs = require('fs');
const path = require('path');
const express = require('express');

// create an express app
const app = express();
// 모듈에서 export한 값을 가져옴
const provider = require('./scripts/data-provider.js');
// data-provider에서 export한 값에서 data (stocks)
const stocks = provider.data;

// handle requests for static resources
app.use('/static', express.static(path.join(__dirname, 'public')));

// set up route handling
// 라우터 과정을 모듈화된 소스에서 실행, app을 인자로 줘야 한다.
const router = require('./scripts/stock-router.js');
router.handleAllStocks(app);
router.handleSingleSymbol(app);
router.handleNameSearch(app);

// Use express to listen to port
let port = process.env.PORT;
app.listen(port, () => {
    console.log("Server running at port= " + port);
});