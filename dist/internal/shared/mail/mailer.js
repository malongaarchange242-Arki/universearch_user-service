"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeMailer = exports.getMailer = void 0;
const mailer_1 = require("../../mail/config/mailer");
let mailerInstance = null;
const getMailer = () => {
    if (!mailerInstance) {
        mailerInstance = (0, mailer_1.createMailer)();
    }
    return mailerInstance;
};
exports.getMailer = getMailer;
const closeMailer = async () => {
    mailerInstance = null;
};
exports.closeMailer = closeMailer;
