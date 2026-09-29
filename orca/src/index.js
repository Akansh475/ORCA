const { createFolder } = require('./tools/createFolder');
const { createFile } = require('./tools/createFile');
const { readFile } = require('./tools/readFile');
const { listDir } = require('./tools/listDir');

console.log(listDir('./test-folder'));
console.log(listDir('./no-such-folder')); // should say doesn't exist

console.log(readFile('./test-folder/hello.txt'));
console.log(readFile('./test-folder/nofile.txt')); // should say doesn't exist

// console.log(createFile('./test-folder/hello.txt', 'Hello from ORCA'));
// console.log(createFile('./test-folder/hello.txt', 'Hello from ORCA')); // should say already exists

// console.log(createFolder('./test-folder'));
// console.log(createFolder('./test-folder')); // should say already exists