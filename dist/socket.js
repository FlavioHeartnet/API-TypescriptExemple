"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const jwt_verifier_1 = __importDefault(require("@okta/jwt-verifier"));
const okta_sdk_nodejs_1 = __importDefault(require("@okta/okta-sdk-nodejs"));
const messageExpirationTimeMS = 10 * 1000;
const defaultUser = {
    id: "anon",
    name: "Anonymous",
};
const sendMessage = (socket) => (message) => socket.emit("message", message);
exports.default = (io) => {
    const messages = new Set();
    const users = new Map();
    io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
        const { token = null } = socket.handshake.query || {};
        if (token) {
            try {
                const [authType, tokenValue] = token.trim().split(" ");
                if (authType !== "Bearer") {
                    throw new Error("Expected a Bearer token");
                }
                const { claims: { sub } } = yield jwtVerifier.verifyAccessToken(tokenValue, "api://default");
                const user = yield oktaClient.getUser(sub);
                users.set(socket, {
                    id: user.id,
                    name: [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" "),
                });
            }
            catch (error) {
                // tslint:disable-next-line:no-console
                console.log(error);
            }
        }
        next();
    }));
    const jwtVerifier = new jwt_verifier_1.default({
        clientId: process.env.OKTA_CLIENT_ID,
        issuer: `${process.env.OKTA_ORG_URL}/oauth2/default`,
    });
    const oktaClient = new okta_sdk_nodejs_1.default.Client({
        orgUrl: process.env.OKTA_ORG_URL,
        token: process.env.OKTA_TOKEN,
    });
    io.on("connection", (socket) => {
        socket.on("getMessages", () => {
            messages.forEach(sendMessage(socket));
        });
        socket.on("message", (value) => {
            const message = {
                id: uuid_1.v4(),
                time: new Date(),
                user: users.get(socket) || defaultUser,
                value,
            };
            socket.on("disconnect", () => {
                users.delete(socket);
            });
            messages.add(message);
            sendMessage(io)(message);
            setTimeout(() => {
                messages.delete(message);
                io.emit("deleteMessage", message.id);
            }, messageExpirationTimeMS);
        });
    });
};
//# sourceMappingURL=socket.js.map