import { FileDescriptor } from './fileDescriptor.js';

export class FileDirectory extends FileDescriptor {
  constructor (parentDescriptor = null) {
    super();
    this.links = new Map();
    this.links.set('.', this);
    this.links.set('..', parentDescriptor || this);
  }
}