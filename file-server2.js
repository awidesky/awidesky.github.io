const http = require("http");
const fs = require("fs");
const url = require("url");
const path = require("path");
// handler for errors
const output500Error = (response) => {
    response.writeHead(500, { "Content-Type": "text/html" });
    response.write("<h1>500 Error</h1>\n");
    response.write("Something went wrong with request\n");
    response.end();
};
// maps file extention to MIME types
const mimeTypes = [
    ['.html', 'text/html'],
    ['.json', 'application/json'],
    ['.ico', 'image/icon'],
    ['.jpg', 'image/jpeg'],
    ['.svg', 'image/svg+xml']
];

const server = http.createServer((req, resp) => {
    let urlFile = url.parse(req.url).pathname;

    // if no file provided in request, default to index.html
    if (urlFile.length == 1) urlFile = "/index.html";
    console.log("Filename in URL=" + urlFile);

    // turn it into the actual file system filename
    const localPath = __dirname + "/public"; // /public을 prefix로
    let localFile = path.join(localPath, urlFile);
    console.log("Filename on device=" + localFile);
    // try reading the file
    fs.readFile(localFile, (err, file) => {
        if (err) {
            output500Error(resp);
            return;
        }
        // based on the URL path, extract the file extension
        const ext = path.parse(localFile).ext;
        // lookup mime type for this extension
        const mime = mimeTypes.find(m => m[0] == ext);

        // specify the mime type of file via header
        const header = {
            "Content-type": mime[1] || "text/plain"
        };
        resp.writeHead(200, header);
        // output the content of file
        resp.write(file);
        resp.end();
    });
});

let port = 8080;
server.listen(port);
console.log("Server running at port= " + port); 