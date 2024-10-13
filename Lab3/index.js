'use strict';

import {
  initialProcessCounter,
  pageStatisticsPerInterval,
  maxPageAccessed, minPageAccessed,
  totalPhysicalPages,
  maxPageRequestsPerProcess,
  minPageRequestsPerProcess,
  maxPageTableSize,
  minPageTableSize
} from './constants.js';
import { Kernel } from './kernel.js';
import { Process } from './process.js';
import { MMU } from './mmu.js';
import { getRandomInt, shouldCreateNewProc, shouldGenerateNewWorkingSet } from './utils.js';

const pageFaultAction = (kernel, virtualPageTable, index) => {
  kernel.pageFaultCounter++;

  const physicalPage = kernel.allocatePhysicalPage();
  physicalPage.assignToPageTable(virtualPageTable, index);
};

const createNewProcess = (minPageTableSize, maxPageTableSize, minRequests, maxRequests) => {
  return new Process(minPageTableSize, maxPageTableSize, minRequests, maxRequests);
};

const accessRandomProcessPages = (process, minRequests, maxRequests, mmu) => {
  const requestCount = getRandomInt(minRequests, maxRequests + 1);
  const writeProbability = 0.3;

  for (let i = 0; i < requestCount; i++) {
    const index = selectPageIndex(process);
    const isWriteOperation = Math.random() < writeProbability;
    mmu.accessPage(process.pageTable, index, isWriteOperation);
    process.reqCount++;

    console.log(`Process ${ process.reqCount }/${ process.procReqLimit }, index ${ index }, r/w ${ isWriteOperation }`);
  }
};

const selectPageIndex = (process) => {
  const workingSetSelectionProbability = 0.9;
  return Math.random() < workingSetSelectionProbability
    ? process.workingSet.pages[Math.floor(Math.random() * process.workingSet.pages.length)]
    : getRandomInt(0, process.pageTable.length);
};

const createInitialProcesses = (processCount) => Array.from({ length: processCount }, () => createNewProcess(minPageTableSize, maxPageTableSize, minPageRequestsPerProcess, maxPageRequestsPerProcess));

const processKernelTasks = (kernel, mmu, processQueue) => {
  processQueue.forEach((currentProcess, index) => {
    handleProcess(kernel, mmu, processQueue, currentProcess, index);
  });

  createNewProcessIfNeeded(processQueue);
  kernel.updatePageStatistics(pageStatisticsPerInterval);
  printPageFaults(kernel, mmu);
};

const handleProcess = (kernel, mmu, processQueue, currentProcess, processIndex) => {
  if (shouldGenerateNewWorkingSet()) {
    currentProcess.workingSet.refresh();
  }
  accessRandomProcessPages(currentProcess, minPageAccessed, maxPageAccessed, mmu);

  if (currentProcess.isCompleted()) {
    kernel.deallocateProcessPages(currentProcess);
    processQueue.splice(processIndex, 1);
  }
};

const createNewProcessIfNeeded = (processQueue) => {
  if (shouldCreateNewProc(processQueue)) {
    processQueue.push(createNewProcess(minPageTableSize, maxPageTableSize, minPageRequestsPerProcess, maxPageRequestsPerProcess));
  }
};

const printPageFaults = (kernel, mmu) => {
  const pageFaults = (kernel.pageFaultCounter / mmu.numberOfPages) * 100;
  console.log(`Overall page miss rate: ${ pageFaults }%`);
};

const main = () => {
  const kernel = new Kernel(totalPhysicalPages);
  const mmu = new MMU((table, idx) => pageFaultAction(kernel, table, idx));
  const initialProcesses = createInitialProcesses(initialProcessCounter);

  setInterval(() => processKernelTasks(kernel, mmu, initialProcesses), 1000);
};

main();