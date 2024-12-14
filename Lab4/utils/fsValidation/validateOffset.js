'use strict';

export const validateOffset = (newOffset, fileSize) => {
  if (newOffset < 0 || newOffset > fileSize) throw new Error('The offset is invalid.');
};