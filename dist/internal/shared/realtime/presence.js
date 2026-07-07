"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presence = void 0;
exports.presence = {
    trackUser: (userId, socketId) => ({ userId, socketId }),
    removeUser: (socketId) => socketId,
};
