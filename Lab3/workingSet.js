'use strict';

export class WorkingSet {
  constructor(pageTable) {
    this.pageTable = pageTable;
    this.pages = this.generateWorkingSet(pageTable);
  }

  generateWorkingSet(pageTable) {
    const workingSetSize = Math.floor(pageTable.length * 0.3);
    return this.generateUniqueRandomSet(workingSetSize, pageTable.length);
  }

  refresh() {
    this.pages = this.generateWorkingSet(this.pageTable);
  }

  generateUniqueRandomSet(size, maxIndex) {
    const set = new Set();
    while (set.size < size) set.add(this.getRandomInt(0, maxIndex));
    return Array.from(set);
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }
}