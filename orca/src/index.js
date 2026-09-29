const { createFolder } = require('./tools/createFolder');
const { createFile } = require('./tools/createFile');

console.log(createFile('./test-folder/hello.txt', 'Hello from ORCA'));
console.log(createFile('./test-folder/hello.txt', 'Hello from ORCA')); // should say already exists

console.log(createFolder('./test-folder'));
console.log(createFolder('./test-folder')); // should say already exists