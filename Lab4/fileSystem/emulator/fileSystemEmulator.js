'use strict';

import { FileSystemModel } from '../model/fileSystemModel.js';
import { FileDirectory } from '../emulatedStructures/fileDirectory.js';
import { RegularFile } from '../emulatedStructures/regularFile.js';
import { validateIsDirectory } from '../../utils/directoryHandlers/validateIsDirectory.js';
import { validateIsRegularFile } from '../../utils/pathHandlers/validateIsRegularFile.js';
import { validatePathExists } from '../../utils/pathHandlers/validatePathExists.js';
import { validatePathDoesNotExist } from '../../utils/pathHandlers/validatePathDoesNotExist.js';

export class FileSystemEmulator {
  constructor () {
    this.fs = new FileSystemModel();
    this.cwdPath = [this.fs.rootDirectory];
    this.Cwd = this.fs.rootDirectory;
  }

  getPathDescriptor (path, cwd) {
    const normalizedPath = this._normalizePath(path);
    if (!normalizedPath) return [null, null, ''];

    const { currentDir, parentDir, pathComponents } = this._initializePathState(normalizedPath, cwd);

    if (normalizedPath === '/') return [this.fs.rootDirectory, this.fs.rootDirectory, ''];

    return this._resolvePathComponents(pathComponents, currentDir, parentDir);
  }

  _normalizePath (path) {
    path = path.trim().replace(/^['"]|['"]$/g, '');
    if (typeof path !== 'string') {
      console.error('Error: Path must be a string');
      return null;
    }
    return path;
  }

  _initializePathState (path, cwd) {
    const currentDir = path[0] === '/' ? this.fs.rootDirectory : cwd;
    const parentDir = currentDir;
    const pathComponents = path.split('/').filter(Boolean);
    return { currentDir, parentDir, pathComponents };
  }

  _resolvePathComponents (pathComponents, currentDir, parentDir) {
    const name = pathComponents[pathComponents.length - 1];
    let descriptor = null;

    for (let i = 0; i < pathComponents.length; i++) {
      const componentName = pathComponents[i];
      descriptor = this.fs.findInDirectory(currentDir, componentName);
      parentDir = currentDir;

      if (!descriptor) break;

      const typeCheckResult = this._handleDescriptorType(descriptor, currentDir, i, pathComponents);
      if (!typeCheckResult) return [null, null, ''];

      currentDir = typeCheckResult;
    }

    return [parentDir, descriptor, name];
  }

  _handleDescriptorType (descriptor, currentDir, index, pathComponents) {
    if (descriptor instanceof FileDirectory) {
      return descriptor;
    } else if (descriptor instanceof RegularFile) {
      if (index !== pathComponents.length - 1) {
        console.error(`Error: File '${ pathComponents[index] }' is not the final component in the path.`);
        return null;
      }
    } else {
      console.error(`Error: Invalid file type for '${ pathComponents[index] }'`);
      return null;
    }
    return currentDir;
  }

  create (path) {
    this._logFileCreation(path);

    try {
      const [parentDirectory, fileName] = this._validatePathForCreation(path, this.Cwd);
      this._createFileInDirectory(parentDirectory, fileName);
    } catch (error) {
      console.error(error.message);
    }
  }

  _logFileCreation (path) {
    console.log(`Regular file '${ path }' was created`);
  }

  _validatePathForCreation (path, cwd) {
    const [parentDirectory, existingDescriptor, fileName] = this.getPathDescriptor(path, cwd);
    validatePathDoesNotExist(parentDirectory, existingDescriptor, path);
    return [parentDirectory, fileName];
  }

  _createFileInDirectory (parentDirectory, fileName) {
    this.fs.createFile(parentDirectory, fileName);
  }

  link (sourcePath, targetPath) {
    console.log(`Creating hard link ${ targetPath } for ${ sourcePath }`);
    try {
      const sourceInfo = this._validateSourcePath(sourcePath);
      const targetInfo = this._validateTargetPath(targetPath);
      this._createHardLink(targetInfo.parentDir, targetInfo.name, sourceInfo.descriptor);
    } catch (error) {
      console.error(error.message);
    }
  }

  _validateSourcePath (sourcePath) {
    const [parentDir, descriptor] = this.getPathDescriptor(sourcePath, this.Cwd);

    validatePathExists(parentDir, descriptor, sourcePath);

    return { parentDir, descriptor };
  }

  _validateTargetPath (targetPath) {
    const [parentDir, descriptor, name] = this.getPathDescriptor(targetPath, this.Cwd);

    validatePathDoesNotExist(parentDir, descriptor, targetPath);

    return { parentDir, name };
  }

  _createHardLink (targetParentDir, targetName, sourceDescriptor) {
    this.fs.createHardLink(targetParentDir, targetName, sourceDescriptor);
  }

  unlink (path) {
    console.log(`Unlinking the file at path: '${ path }'`);

    try {
      const [parentDirectory, targetDescriptor, fileName] = this.getPathDescriptor(path, this.Cwd);
      validatePathExists(parentDirectory, targetDescriptor, path);
      this.fs.removeHardLink(parentDirectory, fileName);
    } catch (error) {
      console.error(error.message);
    }
  }

  ls (path = '') {
    console.log(`Contents for path: '${ path }'`);

    try {
      const directoryDescriptor = this._resolveDirectoryDescriptor(path);
      this.fs.listDirectory(directoryDescriptor);
    } catch (error) {
      console.error(error.message);
    }
  }

  _resolveDirectoryDescriptor (path) {
    if (path === '') return this._getCurrentDirectoryDescriptor();

    const [parentDirectory, targetDescriptor] = this.getPathDescriptor(
      path,
      this._getCurrentDirectoryDescriptor(),
    );

    validatePathExists(parentDirectory, targetDescriptor, path);
    validateIsDirectory(targetDescriptor, path);

    return targetDescriptor;
  }

  _getCurrentDirectoryDescriptor () {
    return this.cwdPath[this.cwdPath.length - 1];
  }

  stat (path) {
    try {
      const [parentDirectory, fileDescriptor] = this.getPathDescriptor(
        path,
        this.cwdPath[this.cwdPath.length - 1],
      );
      validatePathExists(parentDirectory, fileDescriptor, path);
      console.log(`${ fileDescriptor?.getStatistics() }`);
    } catch (error) {
      console.error(error.message);
    }
  }

  open (path) {
    try {
      const fileDescriptor = this._getFileDescriptor(path);
      this._validateFileForOpening(fileDescriptor, path);

      const handle = this._openFileDescriptor(fileDescriptor);
      console.log(`File opened with descriptor: '${ handle }'`);

      return handle;
    } catch (error) {
      console.error(error.message);
    }
  }

  _getFileDescriptor (path) {
    const fileDescriptor = this.getPathDescriptor(
      path,
      this.cwdPath[this.cwdPath.length - 1],
    )[1];

    console.log(fileDescriptor.constructor.name);

    if (!fileDescriptor) throw new Error(`File not found: '${ path }'`);

    return fileDescriptor;
  }

  _validateFileForOpening (fileDescriptor, path) {
    validateIsRegularFile(fileDescriptor, path);
  }

  _openFileDescriptor (fileDescriptor) {
    return this.fs.openFile(fileDescriptor);
  }

  close (fileDescriptor) {
    console.log(`Close file with descriptor '${ fileDescriptor }'`);

    try {
      this.fs.closeFile(fileDescriptor);
    } catch (e) {
      console.error(e.message);
    }
  }

  seek (fileDescriptor, offset) {
    console.log(`File descriptor '${ fileDescriptor }' set to offset '${ offset }'`);

    try {
      this.fs.seekFileOffset(fileDescriptor, offset);
    } catch (e) {
      console.error(e.message);
    }
  }

  read (fileDescriptor, size) {
    console.log(`Reading ${ size } bytes from file with descriptor '${ fileDescriptor }'`);

    try {
      return this.fs.readFile(fileDescriptor, size);
    } catch (e) {
      console.error(e.message);
      return [];
    }
  }

  write (fileDescriptor, size, data) {
    console.log(`Writing ${ size } bytes to file with descriptor '${ fileDescriptor }'`);

    try {
      this.fs.writeFile(fileDescriptor, size, data);
    } catch (e) {
      console.error(e.message);
    }
  }

  truncate (path, size) {
    console.log(`Truncate file '${ path }'`);

    try {
      const fileEntry = this.getPathDescriptor(path, this.Cwd)[1];
      validateIsRegularFile(fileEntry, path);
      this.fs.truncateFile(fileEntry, size);
    } catch (e) {
      console.error(e.message);
    }
  }
}