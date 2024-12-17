'use strict';
let globalIdCounter = 1;
let availableIds = [];

export class FileDescriptor {
  constructor () {
    if (availableIds.length > 0) {
      this.id = availableIds.pop();
    } else {
      this.id = globalIdCounter++;
    }
    this.size = 0;
    this.hardlinkCount = 0;
    console.log(`FileDescriptor ${ this } was invoked`); // logs for descriptors :(
  }

  toString () {
    return `${ this.constructor.name }`;
  }

  getStatistics () {
    return `id=${ this.id }, type=${ this.constructor.name }, nlink=${ this.hardlinkCount }, size=${ this.size }, nblock=${ 0 }`;
  }

  static returnIdToPool (id) {
    if (!availableIds.includes(id)) {
      availableIds.push(id);
    }
  }
}