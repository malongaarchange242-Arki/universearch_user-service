"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const authenticate_1 = require("./authenticate");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return authenticate_1.authenticate; } });
const authorize_1 = require("./authorize");
Object.defineProperty(exports, "authorize", { enumerable: true, get: function () { return authorize_1.authorize; } });
exports.default = {
    authenticate: authenticate_1.authenticate,
    authorize: authorize_1.authorize,
};
