'use strict';

export class MMU {
  constructor(pageFaultHandler) {
    this.numberOfPages = 0;
    this.pageFaultHandler = pageFaultHandler;
  }

  accessPage(pageTable, pageIndex, isWriteOperation) {
    this.numberOfPages++;
    if (!pageTable[pageIndex].P) this.pageFaultHandler(pageTable, pageIndex);
    pageTable[pageIndex].R = true;
    if (isWriteOperation) pageTable[pageIndex].M = true;
  }
}