const { createFolder } = require('./tools/createFolder');
const { createFile } = require('./tools/createFile');
const { readFile } = require('./tools/readFile');
const { listDir } = require('./tools/listDir');
const { runCommand } = require('./tools/runCommand');
const { pickModel } = require('./llm/pickModel');
const { callOllama } = require('./llm/callOllama');


callOllama('llama3.1', 'Create a folder called notes').then(console.log);

// callOllama('llama3.1', 'Say hello in one sentence.').then(console.log);

// console.log(pickModel('build me a login page'));
// console.log(pickModel('organize my downloads folder'));

// console.log(runCommand('echo Hello ORCA'));
// console.log(runCommand('someinvalidcommand123'));

// console.log(listDir('./test-folder'));
// console.log(listDir('./no-such-folder')); // should say doesn't exist

// console.log(readFile('./test-folder/hello.txt'));
// console.log(readFile('./test-folder/nofile.txt')); // should say doesn't exist

// console.log(createFile('./test-folder/hello.txt', 'Hello from ORCA'));
// console.log(createFile('./test-folder/hello.txt', 'Hello from ORCA')); // should say already exists

// console.log(createFolder('./test-folder'));
// console.log(createFolder('./test-folder')); // should say already exists