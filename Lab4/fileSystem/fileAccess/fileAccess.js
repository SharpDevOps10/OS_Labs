export const FileAccess = {
  Read: 1,        // 0001
  Write: 2,       // 0010
  ReadWrite: 3,   // 0011 (Read | Write)
};

Object.freeze(FileAccess);