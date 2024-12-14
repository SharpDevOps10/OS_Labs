import { FileDescriptor } from './fileDescriptor.js';

export class RegularFile extends FileDescriptor {
  constructor () {
    super();
    this.data = new Map();
  }

  getStatistics () {
    return `id=${ this.id }, type=${ this.constructor.name }, nlink=${ this.hardlinkCount }, size=${ this.size }, nblock=${ this.data.size }`;
  }
}