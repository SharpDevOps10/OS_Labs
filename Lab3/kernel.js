'use strict';

import { PhysicalPage } from './physicalPage.js';

export class Kernel {
  constructor(physicalPageCount) {
    if (physicalPageCount <= 0) throw new Error('Number of physical pages must be greater than zero');

    this.arrayOfFreePages = Array.from({ length: physicalPageCount }, (_, i) => new PhysicalPage(i));
    this.allocatedPageArray = [];
    this.pageFaultCounter = 0;
    this.clockPointer = 0;
    this.lastUpdatedPageIndex = 0;
    this.pageAlgorithm = this.randomReplacementAlgorithm.bind(this);
  }

  allocatePhysicalPage() {
    if (this.arrayOfFreePages.length > 0) {
      return this.retrieveFreePhysicalPage();
    } else {
      const physicalPage = this.pageAlgorithm();
      physicalPage.clearPageTable();
      return physicalPage;
    }
  }

  retrieveFreePhysicalPage() {
    const physicalPage = this.arrayOfFreePages.shift();
    this.allocatedPageArray.push(physicalPage);
    return physicalPage;
  }

  deallocateProcessPages(process) {
    process.pageTable.forEach((pageEntry) => {
      if (!pageEntry.P) return;
      pageEntry.P = false;
      const allocatedPageIndex = this.allocatedPageArray.findIndex((pp) => pp.PPN === pageEntry.PPN);
      const allocatedPage = this.allocatedPageArray.splice(allocatedPageIndex, 1)[0];
      this.arrayOfFreePages.push(allocatedPage);
    });
  }

  updatePageStatistics(numberOfUpdates) {
    if (this.allocatedPageArray.length === 0) return;

    for (let i = 0; i < numberOfUpdates; i++) {
      if (this.lastUpdatedPageIndex >= this.allocatedPageArray.length) {
        this.lastUpdatedPageIndex = 0;
      }

      const physicalPage = this.allocatedPageArray[this.lastUpdatedPageIndex];
      physicalPage.updateStatistics();

      this.lastUpdatedPageIndex++;
    }
  }

  clockAlgorithm() {
    let counterOfRecords = 0;
    let pageReplacement = false;
    let candidatePage;

    while (!pageReplacement) {
      candidatePage = this.allocatedPageArray[this.clockPointer];

      if (!candidatePage) throw new Error('Physical page is undefined');

      const pageEntry = candidatePage.pageTable[candidatePage.pageIndex];
      if (!pageEntry) throw new Error('Invalid page entry in physical page');

      pageReplacement = this.shouldReplacePage(pageEntry, counterOfRecords);
      if (!pageReplacement && pageEntry.M) counterOfRecords++;

      this.advanceClockPointer();
    }

    console.log(`Page replacement: PPN: ${ candidatePage.PPN }, Index: ${ candidatePage.pageIndex }, Table Status: ${ JSON.stringify(candidatePage.pageTable[candidatePage.pageIndex]) } (Clock Algorithm)`);
    return candidatePage;
  }

  shouldReplacePage(pageEntry, counterOfRecords) {
    const limitsOfRecords = 8;

    if (!pageEntry.R) {
      if (pageEntry.M && counterOfRecords < limitsOfRecords) {
        pageEntry.M = false;
        return false;
      } else {
        return true;
      }
    } else {
      pageEntry.R = false;
      return false;
    }
  }

  advanceClockPointer() {
    this.clockPointer = (this.clockPointer + 1) % this.allocatedPageArray.length;
  }

  randomReplacementAlgorithm() {
    const randomIndex = Math.floor(Math.random() * this.allocatedPageArray.length);
    const physPage = this.allocatedPageArray[randomIndex];
    console.log(`Page replacement: PPN: ${ physPage.PPN }, Index: ${ physPage.pageIndex }, Table Status: ${ JSON.stringify(physPage.pageTable[physPage.pageIndex]) } (Random Algorithm)`);
    return physPage;
  }
}