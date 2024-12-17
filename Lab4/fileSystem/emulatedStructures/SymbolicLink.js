import { FileDescriptor } from './fileDescriptor.js';

export class SymbolicLink extends FileDescriptor {
  constructor (value) {
    super();
    this.value = value;
    this.hardlinkCount = 1;
  }

  getStatistics () {
    return `id=${ this.id }, type=${ this.constructor.name }, target=${ this.value }, nlink=${ this.hardlinkCount }, size=${ this.size }, nblock=${ 0 }`;
  }
}