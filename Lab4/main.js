'use strict';

import { FileSystemEmulator } from './fileSystem/emulator/fileSystemEmulator.js';
import readline from 'readline';

const fsEmul = new FileSystemEmulator();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const parseArgs = (inputWords, schema) => {
  const args = {};
  schema.forEach((key, index) => {
    args[key] = inputWords[index] ?? null;
  });
  return args;
};

const commandList = new Map([
  ['stat', ({ path }) => path ? fsEmul.stat(path) : 'Usage: stat <path>'],
  ['ls', ({ path }) => fsEmul.ls(path?.trim() || '')],
  ['create', ({ filename }) => filename ? fsEmul.create(filename) : 'Usage: create <filename>'],
  ['open', ({ filename }) => filename ? fsEmul.open(filename) : 'Usage: open <filename>'],
  ['close', ({ fd }) => fd ? fsEmul.close(Number(fd)) : 'Usage: close <fd>'],
  ['seek', ({ fd, offset }) => (fd && offset) ? fsEmul.seek(Number(fd), Number(offset)) : 'Usage: seek <fd> <offset>'],
  ['read', ({ fd, size }) => {
    if (fd && size) {
      const byteData = fsEmul.read(Number(fd), Number(size));
      const strData = Buffer.from(byteData).toString('utf8');
      console.log(`Data: ${strData}`);
    } else {
      console.log('Usage: read <fd> <size>');
    }
  }],
  ['write', ({ fd, size, data }) => {
    if (fd && size && data) {
      const byteData = Buffer.from(data, 'utf8');
      fsEmul.write(Number(fd), Number(size), byteData);
    } else {
      console.log('Usage: write <fd> <size> <data>');
    }
  }],
  ['link', ({ target, linkname }) => (target && linkname) ? fsEmul.link(target, linkname) : 'Usage: link <target> <linkname>'],
  ['unlink', ({ path }) => path ? fsEmul.unlink(path) : 'Usage: unlink <path>'],
  ['truncate', ({ path, length }) => (path && length) ? fsEmul.truncate(path, Number(length)) : 'Usage: truncate <path> <length>'],
]);

const processCommand = async (input) => {
  const inputWords = input.split(' ').filter(Boolean);
  const command = inputWords[0];
  const argsSchema = {
    'stat': ['path'],
    'ls': ['path'],
    'create': ['filename'],
    'open': ['filename'],
    'close': ['fd'],
    'seek': ['fd', 'offset'],
    'read': ['fd', 'size'],
    'write': ['fd', 'size', 'data'],
    'link': ['target', 'linkname'],
    'unlink': ['path'],
    'truncate': ['path', 'length'],
  };

  if (commandList.has(command)) {
    const schema = argsSchema[command] || [];
    const args = parseArgs(inputWords.slice(1), schema);
    const result = await commandList.get(command)(args);
    if (typeof result === 'string') console.log(result);
  } else {
    console.log(`Wrong command ${command}`);
  }
};

const startCommandLoop = () => {
  rl.question('$ ', async (input) => {
    if (input) await processCommand(input);
    startCommandLoop();
  });
};

startCommandLoop();