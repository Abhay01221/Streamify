import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { redis } from '../utils/redis';

export const setupSocketIO = (io: SocketIOServer) => {
  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join contest room for leaderboard updates
    socket.on('contest:join', (contestId: string) => {
      socket.join(`contest:${contestId}`);
    });

    socket.on('contest:leave', (contestId: string) => {
      socket.leave(`contest:${contestId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  // Contest leaderboard updates every 30 seconds
  setInterval(async () => {
    const rooms = io.sockets.adapter.rooms;
    for (const [room] of rooms) {
      if (room.startsWith('contest:')) {
        const contestId = room.replace('contest:', '');
        try {
          const leaderboard = await getContestLeaderboard(contestId);
          io.to(room).emit('contest:leaderboard', leaderboard);
        } catch (err) {
          logger.error(`Failed to update leaderboard for ${contestId}:`, err);
        }
      }
    }
  }, 30000);
};

const getContestLeaderboard = async (contestId: string) => {
  const { prisma } = await import('../utils/prisma');

  const participants = await prisma.contestParticipant.findMany({
    where: { contestId },
    orderBy: [{ score: 'desc' }, { penalty: 'asc' }],
    take: 50,
    include: {
      user: {
        select: {
          username: true,
          profile: { select: { avatarUrl: true, country: true } },
        },
      },
    },
  });

  return participants.map((p, i) => ({
    rank: i + 1,
    userId: p.userId,
    username: p.user.username,
    avatar: p.user.profile?.avatarUrl,
    country: p.user.profile?.country,
    score: p.score,
    penalty: p.penalty,
  }));
};
