'use strict';

import { PageTableEntry } from './pageTableEntry.js';
import { WorkingSet } from './workingSet.js';

export class Process {
  constructor(minTableSize, maxTableSize, minRequests, maxRequests) {
    const pageTableSize = this.getRandomInt(minTableSize, maxTableSize + 1);
    this.pageTable = Array.from({ length: pageTableSize }, () => new PageTableEntry());
    this.workingSet = new WorkingSet(this.pageTable);
    this.procReqLimit = this.getRandomInt(minRequests, maxRequests);
    this.reqCount = 0;
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  isCompleted() {
    return this.reqCount >= this.procReqLimit;
  }
}
