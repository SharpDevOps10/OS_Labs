'use strict';

import { RegularFile } from '../../fileSystem/emulatedStructures/regularFile.js';

export const validateIsRegularFile = (entryDescriptor, pathStr) => {
  if (!(entryDescriptor instanceof RegularFile)) throw new Error(`Error: The path '${ pathStr }' does not point to a regular file.`);
};