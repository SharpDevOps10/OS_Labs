'use strict';
let globalIdCounter = 1;

export class FileDescriptor {
  constructor () {
    this.size = 0;
    this.hardlinkCount = 0;
    this.id = globalIdCounter++;
    console.log(`FileDescriptor ${ this } was invoked`); // logs for descriptors :(
  }

  toString () {
    return `${ this.constructor.name }`;
  }

  getStatistics () {
    return `id=${ this.id }, type=${ this.constructor.name }, nlink=${ this.hardlinkCount }, size=${ this.size }, nblock=${ 0 }`;
  }
}