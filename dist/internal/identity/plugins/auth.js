"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/plugins/auth.ts
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
// Plugin no-op kept for compatibility if other parts expect an `auth` plugin file.
// Do NOT decorate `authenticate` here — use middleware functions in `src/middleware`.
exports.default = (0, fastify_plugin_1.default)(async () => {
    // intentionally empty
});
