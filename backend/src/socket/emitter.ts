/**
 * socketEmitter.ts
 *
 * Holds a reference to the Socket.IO server instance so that modules like
 * submissionQueue can emit events without importing index.ts (which would
 * create a circular dependency and leave `io` undefined at runtime).
 *
 * Usage:
 *   - Call `setIO(io)` once in index.ts after creating the SocketIOServer.
 *   - Call `getIO()` anywhere else to emit events.
 */

import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | null = null;

export const setIO = (io: SocketIOServer): void => {
  _io = io;
};

export const getIO = (): SocketIOServer => {
  if (!_io) {
    throw new Error('Socket.IO server not initialised. Call setIO(io) in index.ts first.');
  }
  return _io;
};
