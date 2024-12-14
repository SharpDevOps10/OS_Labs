'use strict';

export const validateReadSize = (entry, size) => {
  if (size <= 0 || entry.desc.size - entry.offset < size) {
    throw new Error('Invalid size');
  }
};