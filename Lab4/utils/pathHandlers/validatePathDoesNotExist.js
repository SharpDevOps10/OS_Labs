'use strict';

export const validatePathDoesNotExist = (parentDir, targetEntry, pathStr) => {
  if (!parentDir) throw new Error(`Error: The parent directory for the path '${pathStr}' does not exist or is invalid.`);
  if (targetEntry !== null) throw new Error(`Error: The path '${pathStr}' already exists as a file or directory.`);
};