import { FileAccess } from './fileAccess.js';

export const validateReadAccess = (fileTableEntry) => {
  if (fileTableEntry.accessMode !== FileAccess.Read && fileTableEntry.accessMode !== FileAccess.ReadWrite) {
    throw new Error('No access for reading.');
  }
};

export const validateWriteAccess = (fileTableEntry) => {
  if (fileTableEntry.accessMode !== FileAccess.Write && fileTableEntry.accessMode !== FileAccess.ReadWrite) {
    throw new Error('No access for writing');
  }
};