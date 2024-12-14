'use strict';

import { FileDirectory } from '../emulatedStructures/fileDirectory.js';
import { RegularFile } from '../emulatedStructures/regularFile.js';
import { FileAccess } from '../fileAccess/fileAccess.js';
import { validateFileDescriptor } from '../../utils/fsValidation/validateFileDescriptor.js';
import { validateOffset } from '../../utils/fsValidation/validateOffset.js';
import { validateReadSize } from '../../utils/fsValidation/validateReadSize.js';
import { validateReadAccess, validateWriteAccess } from '../fileAccess/validateAccess.js';
import { validateWriteData } from '../../utils/fsValidation/validateWriteData.js';
import { updateFileEntrySizeAndOffset } from '../calculations/updateFileEntrySizeAndOffset.js';

const SIZE_OF_BLOCK = 16;

export class FileSystemModel {
  constructor () {
    this.rootDirectory = new FileDirectory();
    this.fileDescriptorTable = {};
  }

  findInDirectory (directory, fileName) {
    if (!directory || !(directory instanceof FileDirectory)) {
      console.error('Error: Provided directory is invalid or not a directory object');
      return null;
    }
    if (directory.links.has(fileName)) return directory.links.get(fileName);

    return null;
  }

  createFile (directory, fileName) {
    const newFileDescriptor = new RegularFile();
    newFileDescriptor.hardlinkCount = 1;

    directory.links.set(fileName, newFileDescriptor);
  }

  createHardLink (directory, linkName, targetFileDescriptor) {
    targetFileDescriptor.hardlinkCount++;
    directory.links.set(linkName, targetFileDescriptor);
  }

  removeHardLink (directory, linkName) {
    if (directory.links.has(linkName)) {
      const fileDescriptor = directory.links.get(linkName);
      directory.links.delete(linkName);
      if (fileDescriptor) fileDescriptor.hardlinkCount--;
    } else {
      console.log(`Name ${ linkName } not found in directory.`);
    }
  }

  listDirectory (directory) {
    for (const [fileName, fileDescriptor] of directory.links) {
      let output = `\t${ fileName } is ${ fileDescriptor.constructor.name }`;
      if (fileDescriptor instanceof RegularFile || fileDescriptor instanceof FileDirectory) output += `, ID: ${ fileDescriptor.id }`;
      console.log(output);
    }
  }

  openFile (fileDescriptor) {
    const fileDescriptorIndex = this.findAvailableFileDescriptorIndex();
    this.checkFileLimit();
    this.fileDescriptorTable[fileDescriptorIndex] = this.createFileTableEntry(fileDescriptor);

    return fileDescriptorIndex;
  }

  findAvailableFileDescriptorIndex () {
    let index = 0;
    while (this.fileDescriptorTable[index]) index++;
    return index;
  }

  checkFileLimit () {
    if (Object.keys(this.fileDescriptorTable).length >= 80) throw new Error('Cannot open file: Too many files are opened');
  }

  createFileTableEntry (fileDescriptor) {
    return {
      desc: fileDescriptor,
      offset: 0,
      accessMode: FileAccess.ReadWrite,
      referenceCount: 0,
    };
  }

  closeFile (fileDescriptorIndex) {
    const fileTableEntry = this.fileDescriptorTable[fileDescriptorIndex];
    if (!fileTableEntry) throw new Error('The file descriptor provided is invalid.');

    delete this.fileDescriptorTable[fileDescriptorIndex];
    fileTableEntry.referenceCount--;
  }

  seekFileOffset (fileDescriptorIndex, newOffset) {
    const fileTableEntry = validateFileDescriptor(fileDescriptorIndex, this.fileDescriptorTable);
    validateOffset(newOffset, fileTableEntry.desc.size);

    fileTableEntry.offset = newOffset;
  }

  readFile (fileDescriptorIndex, size) {
    const fileDescriptor = validateFileDescriptor(fileDescriptorIndex, this.fileDescriptorTable);

    validateReadAccess(fileDescriptor);
    validateReadSize(fileDescriptor, size);

    const readingSize = Math.min(size, fileDescriptor.desc.size - fileDescriptor.offset);
    const readData = this.readFileData(fileDescriptor, readingSize);

    fileDescriptor.offset += readingSize;
    return readData;
  }

  readFileData (entry, readingSize) {
    const readData = new Uint8Array(readingSize);
    let readingIndex = 0;
    let blockIndex = Math.floor(entry.offset / SIZE_OF_BLOCK);
    let blockOffset = entry.offset % SIZE_OF_BLOCK;

    while (readingIndex < readingSize) {
      const bytesToCopy = Math.min(SIZE_OF_BLOCK - blockOffset, readingSize - readingIndex);

      const block = entry.desc.data.get(blockIndex);
      if (block) readData.set(block.slice(blockOffset, blockOffset + bytesToCopy), readingIndex);
      else readData.fill(0, readingIndex, readingIndex + bytesToCopy);

      readingIndex += bytesToCopy;
      blockIndex++;
      blockOffset = 0;
    }

    return readData;
  }

  writeFile(fileDescriptorIndex, bytesToWrite, writeData) {
    const fileTableEntry = validateFileDescriptor(fileDescriptorIndex, this.fileDescriptorTable);

    validateWriteAccess(fileTableEntry);
    validateWriteData(bytesToWrite, writeData);

    this.writeToBlocks(fileTableEntry, bytesToWrite, writeData);

    updateFileEntrySizeAndOffset(fileTableEntry, bytesToWrite);
  }

  writeToBlocks (fileTableEntry, bytesToWrite, writeData) {
    let bytesWritten = 0;
    let blockIndex = Math.floor(fileTableEntry.offset / SIZE_OF_BLOCK);
    let blockOffset = fileTableEntry.offset % SIZE_OF_BLOCK;

    while (bytesWritten < bytesToWrite) {
      let block = fileTableEntry.desc.data.get(blockIndex);
      if (!block) {
        block = new Uint8Array(SIZE_OF_BLOCK);
        fileTableEntry.desc.data.set(blockIndex, block);
      }

      const bytesToCopy = Math.min(SIZE_OF_BLOCK - blockOffset, bytesToWrite - bytesWritten);
      block.set(writeData.slice(bytesWritten, bytesWritten + bytesToCopy), blockOffset);

      bytesWritten += bytesToCopy;
      blockIndex++;
      blockOffset = 0;
    }
  }

  truncateFile (fileDescriptor, newSize) {
    if (newSize < 0) throw new Error('Negative size');

    const blocksToRetain = Math.ceil(newSize / SIZE_OF_BLOCK);

    Object.keys(fileDescriptor.data).forEach((key) => {
      if (parseInt(key) >= blocksToRetain) delete fileDescriptor.data[key];
    });

    fileDescriptor.size = newSize;
  }
}