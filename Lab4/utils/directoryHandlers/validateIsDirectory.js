'use strict';

import { FileDirectory } from '../../fileSystem/emulatedStructures/fileDirectory.js';

export const validateIsDirectory = (entryDescriptor, pathStr) => {
  if (!(entryDescriptor instanceof FileDirectory)) throw new Error(`The path '${ pathStr }' does not point to a directory.`);
};