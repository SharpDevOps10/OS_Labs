'use strict';

export const validatePathExists = (parentDir, targetEntry, pathStr) => {
  if (parentDir === null) throw new Error(`Error: The parent directory for the path '${pathStr}' does not exist or is invalid.`);
  if (targetEntry === null) throw new Error(`Error: The specified path '${pathStr}' does not exist as a file or directory.`);
};