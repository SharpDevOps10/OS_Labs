'use strict';

export const validateWriteData = (bytesToWrite, writeData) => {
  if (bytesToWrite <= 0 || bytesToWrite !== writeData.length) {
    throw new Error('Invalid size');
  }
};