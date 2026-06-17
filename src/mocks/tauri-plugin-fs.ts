/**
 * Tauri Plugin FS Mock — 用于在浏览器中运行前端应用，无需 Tauri 后端。
 * 通过 Vite alias 替换 @tauri-apps/plugin-fs 的 readFile 和 BaseDirectory。
 */

export async function readFile(path: string): Promise<Uint8Array> {
  const mock = window.__testTauriMock;
  const data = mock.fs[path];
  if (data) {
    return new Uint8Array(data);
  }
  return new Uint8Array(0);
}

export async function writeFile(_path: string, _data: Uint8Array | string): Promise<void> {
  // no-op in web mock
}

export async function exists(_path: string): Promise<boolean> {
  return false;
}

export async function mkdir(_path: string): Promise<void> {
  // no-op
}

export async function remove(_path: string): Promise<void> {
  // no-op
}

export async function readDir(_path: string): Promise<{ name: string; isFile: boolean; isDirectory: boolean }[]> {
  return [];
}

export const BaseDirectory = {
  Audio: 1,
  Cache: 2,
  Config: 3,
  Data: 4,
  Desktop: 5,
  Document: 6,
  Download: 7,
  Executable: 8,
  Font: 9,
  Home: 10,
  LocalData: 11,
  Picture: 12,
  Public: 13,
  Resource: 14,
  Runtime: 15,
  Temp: 16,
  Template: 17,
  Video: 18,
} as const;

export type BaseDirectory = typeof BaseDirectory[keyof typeof BaseDirectory];
