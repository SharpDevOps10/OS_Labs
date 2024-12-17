'use strict';

import { FileSystemModel, SIZE_OF_BLOCK } from '../model/fileSystemModel.js';
import { FileDirectory } from '../emulatedStructures/fileDirectory.js';
import { RegularFile } from '../emulatedStructures/regularFile.js';
import { validateIsDirectory } from '../../utils/directoryHandlers/validateIsDirectory.js';
import { validateIsRegularFile } from '../../utils/pathHandlers/validateIsRegularFile.js';
import { validatePathExists } from '../../utils/pathHandlers/validatePathExists.js';
import { validatePathDoesNotExist } from '../../utils/pathHandlers/validatePathDoesNotExist.js';
import { FileDescriptor } from '../emulatedStructures/fileDescriptor.js';
import { SymbolicLink } from '../emulatedStructures/SymbolicLink.js';

export const MAX_SYMLINKS = 25;

export class FileSystemEmulator {
  constructor () {
    this.fs = new FileSystemModel();
    this.cwdPath = [this.fs.rootDirectory];
    this.Cwd = this.fs.rootDirectory;
  }

  getPathDescriptor (path, cwd, followSymlinks = true) {
    const normalizedPath = this._normalizePath(path, this._getPathFromDescriptor(cwd));

    const { currentDir, parentDir, pathComponents } = this._initializePathState(normalizedPath, cwd);

    if (normalizedPath === '/') return [this.fs.rootDirectory, this.fs.rootDirectory, ''];

    const [parent, descriptor, lastComponent] = this._resolvePathComponents(pathComponents, currentDir, parentDir, 0, followSymlinks);

    if (descriptor instanceof SymbolicLink) {
      return [parent, descriptor, lastComponent];
    }

    return [parent, descriptor, lastComponent];
  }

  _normalizePath (path, currentDir = '') {
    path = path.trim().replace(/^['"]|['"]$/g, '');

    if (path.startsWith('/')) {
      currentDir = '';
    }

    const fullPath = (currentDir + '/' + path).replace(/\/+/g, '/');
    const components = fullPath.split('/').filter(Boolean);
    const normalizedComponents = [];

    for (const component of components) {
      if (component === '.') continue;
      if (component === '..') normalizedComponents.pop();
      else normalizedComponents.push(component);
    }

    return '/' + normalizedComponents.join('/');
  }

  _initializePathState (path, cwd) {
    const currentDir = path[0] === '/' ? this.fs.rootDirectory : cwd;
    const parentDir = currentDir;
    const pathComponents = path.split('/').filter(Boolean);
    return { currentDir, parentDir, pathComponents };
  }

  _resolvePathComponents (pathComponents, currentDir, parentDir, symlinkCount = 0, followSymlinks = true) {
    if (symlinkCount > MAX_SYMLINKS) {
      console.error('Too many symbolic link levels, possible cycle detected.');
      return [null, null, ''];
    }

    let descriptor = null;

    for (let i = 0; i < pathComponents.length; i++) {
      const componentName = pathComponents[i];
      descriptor = this.fs.findInDirectory(currentDir, componentName);
      parentDir = currentDir;

      if (!descriptor) break;

      if (descriptor instanceof SymbolicLink) {
        if (followSymlinks) {
          symlinkCount++;

          const targetPath = this._normalizePath(descriptor.value, this._getPathFromDescriptor(currentDir));
          const remainingComponents = pathComponents.slice(i + 1);
          const fullNewPath = this._normalizePath(targetPath + '/' + remainingComponents.join('/'));

          return this._resolvePathComponents(this._splitPath(fullNewPath), this.fs.rootDirectory, parentDir, symlinkCount, followSymlinks);
        } else {
          return [parentDir, descriptor, componentName];
        }
      }

      if (descriptor instanceof FileDirectory) {
        currentDir = descriptor;
      } else if (descriptor instanceof RegularFile && i === pathComponents.length - 1) {
        return [parentDir, descriptor, componentName];
      } else {
        throw new Error(`Invalid path component: '${ componentName }'`);
      }
    }

    return [parentDir, descriptor, pathComponents[pathComponents.length - 1]];
  }

  _splitPath (path) {
    return this._normalizePath(path).split('/').filter(Boolean);
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
    const normalizedPath = this._normalizePath(path, this._getPathFromDescriptor(cwd));
    const [parentDirectory, existingDescriptor, fileName] = this.getPathDescriptor(normalizedPath, this.fs.rootDirectory);

    validatePathDoesNotExist(parentDirectory, existingDescriptor, normalizedPath);
    return [parentDirectory, fileName];
  }

  _createFileInDirectory (parentDirectory, fileName) {
    this.fs.createFile(parentDirectory, fileName);
  }

  link (sourcePath, targetPath) {
    console.log(`Creating hard link ${ targetPath } for ${ sourcePath }`);
    try {
      const { parentDir, descriptor } = this._validateSourcePath(sourcePath);

      if (descriptor instanceof FileDirectory) {
        throw new Error('Cannot create a hard link for a directory.');
      }

      if (descriptor instanceof SymbolicLink) {
        const targetInfo = this._validateTargetPath(targetPath);
        this._createHardLink(targetInfo.parentDir, targetInfo.name, descriptor);
        return;
      }

      if (descriptor instanceof RegularFile) {
        const targetInfo = this._validateTargetPath(targetPath);
        this._createHardLink(targetInfo.parentDir, targetInfo.name, descriptor);
        return;
      }

      throw new Error(`Unsupported file type for hard link.`);
    } catch (error) {
      console.error(error.message);
    }
  }

  _validateSourcePath (sourcePath) {
    const result = this.getPathDescriptor(sourcePath, this.Cwd, false);

    if (!Array.isArray(result) || result.length < 2) {
      throw new Error(`Invalid path descriptor for sourcePath: ${ sourcePath }`);
    }

    const [parentDir, descriptor] = result;

    validatePathExists(parentDir, descriptor, sourcePath);

    if (descriptor instanceof FileDirectory) {
      throw new Error(`Source path ${ sourcePath } is a directory. Hard links to directories are not allowed.`);
    }

    return { parentDir, descriptor };
  }

  _validateTargetPath (targetPath) {
    const [parentDir, descriptor, name] = this.getPathDescriptor(targetPath, this.Cwd, false);

    validatePathDoesNotExist(parentDir, descriptor, targetPath);

    return { parentDir, name };
  }

  _createHardLink (targetParentDir, targetName, sourceDescriptor) {
    this.fs.createHardLink(targetParentDir, targetName, sourceDescriptor);
  }

  unlink (path) {
    console.log(`Unlinking the file at path: '${ path }'`);

    try {
      const [parentDirectory, targetDescriptor, fileName] = this.getPathDescriptor(path, this.Cwd, false);

      validatePathExists(parentDirectory, targetDescriptor, path);

      if (targetDescriptor instanceof SymbolicLink) {
        console.log(`Unlinking symbolic link: '${ fileName }'`);
        parentDirectory.links.delete(fileName);
      } else if (targetDescriptor instanceof FileDirectory) {
        throw new Error(`Cannot unlink a directory: '${ fileName }'`);
      } else {
        console.log(`Unlinking file: '${ fileName }'`);
        this.fs.removeHardLink(parentDirectory, fileName);
      }
    } catch (error) {
      console.error(error.message);
    }
  }

  ls (path = '') {
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

  mkdir (pathname) {
    try {
      const [parentDirectory, existingDescriptor, dirName] = this.getPathDescriptor(pathname, this.Cwd);
      validatePathDoesNotExist(parentDirectory, existingDescriptor, pathname);

      const newDirectory = new FileDirectory(parentDirectory);
      parentDirectory.links.set(dirName, newDirectory);

      newDirectory.hardlinkCount = 2;
      parentDirectory.hardlinkCount++;

      this.fs.fileDescriptorTable[newDirectory.id] = newDirectory;
      console.log(`Directory '${ pathname }' created successfully.`);
    } catch (error) {
      console.error(error.message);
    }
  }

  rmdir (pathname) {
    try {
      const [parentDirectory, existingDescriptor, dirName] = this.getPathDescriptor(pathname, this.Cwd);

      if (!existingDescriptor || existingDescriptor.constructor !== FileDirectory) {
        throw new Error(`Directory ${ pathname } does not exist or is not a directory`);
      }

      if (existingDescriptor.hardlinkCount > 2) {
        throw new Error(`Directory ${ pathname } is not empty`);
      }

      parentDirectory.links.delete(dirName);
      parentDirectory.hardlinkCount--;

      FileDescriptor.returnIdToPool(existingDescriptor.id);

      existingDescriptor.links.clear();
      if (this.fs.fileDescriptorTable[existingDescriptor.id]) {
        delete this.fs.fileDescriptorTable[existingDescriptor.id];
      }

      console.log(`Directory '${ pathname }' removed successfully.`);
    } catch (error) {
      console.error(error.message);
    }
  }

  pwd () {
    console.log(`Current working directory: '${ this._getPathFromDescriptor(this.Cwd) }'`);
  }

  cd (pathname) {
    try {
      const targetDescriptor = this._resolveDirectoryDescriptor(pathname);
      this.Cwd = targetDescriptor;

      this.cwdPath = this._getPathFromDescriptor(targetDescriptor).split('/').filter(Boolean);

      console.log(`Current working directory changed to: '${ this.cwdPath.join('/') }'`);
    } catch (error) {
      console.error(error.message);
    }
  }

  symlink (str, pathname) {
    console.log(`Creating symbolic link at '${ pathname }' with target '${ str }'`);

    try {
      if (str.length > SIZE_OF_BLOCK) {
        throw new Error(`Symbolic link content exceeds maximum allowed size of ${ SIZE_OF_BLOCK }`);
      }

      const targetInfo = this.getPathDescriptor(str, this.Cwd);
      if (!targetInfo) {
        throw new Error(`Target path '${ str }' does not exist.`);
      }

      const symlinkDescriptor = new SymbolicLink(str);
      this.fs.fileDescriptorTable[symlinkDescriptor.id] = symlinkDescriptor;

      const [parentDirectory, existingDescriptor, symlinkName] = this.getPathDescriptor(pathname, this.Cwd);
      if (existingDescriptor) {
        throw new Error(`Path '${ pathname }' already exists.`);
      }

      parentDirectory.links.set(symlinkName, symlinkDescriptor);
      console.log(`Symbolic link '${ pathname }' created successfully.`);
    } catch (error) {
      console.error(error.message);
    }
  }

  _getPathFromDescriptor (descriptor) {
    if (!descriptor || descriptor === this.fs.rootDirectory) return '/';

    const pathComponents = [];
    let current = descriptor;

    while (current && current !== this.fs.rootDirectory) {
      const parent = current.parentDirectory;
      let found = false;

      for (const [name, childDescriptor] of parent.links) {
        if (childDescriptor === current) {
          pathComponents.unshift(name);
          found = true;
          break;
        }
      }

      if (!found) {
        console.error('Descriptor not found in parent directory links!');
        break;
      }

      current = parent;
    }

    return '/' + pathComponents.join('/');
  }

  stat (path) {
    try {
      const [parentDirectory, fileDescriptor] = this.getPathDescriptor(
        path,
        this._getCurrentDirectoryDescriptor(),
        false,
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
      this._getCurrentDirectoryDescriptor(),
    )[1];

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

  _getCurrentDirectoryDescriptor () {
    if (!this.Cwd) throw new Error('Current working directory is not set.');
    return this.Cwd;
  }
}