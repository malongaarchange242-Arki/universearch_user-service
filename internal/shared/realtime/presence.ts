export const presence = {
  trackUser: (userId: string, socketId: string) => ({ userId, socketId }),
  removeUser: (socketId: string) => socketId,
};
