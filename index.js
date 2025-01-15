


const PORT = 7777;

let static = require('node-static');
 
//
// Create a node-static server instance to serve the './public' folder
//
let file = new static.Server('./public');
 
require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        //
        // Serve files!
        //
        file.serve(request, response);
    }).resume();
}).listen(PORT);
