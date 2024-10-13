'use strict';

export class PhysicalPage {
  constructor(PPN) {
    this.PPN = PPN;
    this.pageTable = null;
    this.pageIndex = null;
  }

  assignToPageTable(pageTable, pageIndex) {
    this.pageTable = pageTable;
    this.pageIndex = pageIndex;
    pageTable[pageIndex].P = true;
    pageTable[pageIndex].PPN = this.PPN;
  }

  clearPageTable() {
    if (this.pageTable) {
      this.pageTable[this.pageIndex].P = false;
      this.pageTable = null;
      this.pageIndex = null;
    }
  }

  updateStatistics() {
    if (this.pageTable) {
      this.pageTable[this.pageIndex].R = false;
      console.log(`Page statistics updated for PPN: ${ this.PPN }, Index: ${ this.pageIndex }, Table Entry: ${ JSON.stringify(this.pageTable[this.pageIndex]) }`);
    }
  }
}