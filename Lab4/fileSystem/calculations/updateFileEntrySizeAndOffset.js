'use strict';

export const updateFileEntrySizeAndOffset = (fileTableEntry, bytesWritten) => {
  fileTableEntry.offset += bytesWritten;
  fileTableEntry.desc.size = Math.max(fileTableEntry.desc.size, fileTableEntry.offset);
};