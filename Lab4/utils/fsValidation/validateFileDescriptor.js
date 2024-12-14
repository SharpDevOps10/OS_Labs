'use strict';

export const validateFileDescriptor = (fileDescriptorIndex, fileDescriptorTable) => {
  const fileTableEntry = fileDescriptorTable[fileDescriptorIndex];
  if (!fileTableEntry) throw new Error('File descriptor is invalid.');

  return fileTableEntry;
};