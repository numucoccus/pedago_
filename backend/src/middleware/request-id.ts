import type { NextFunction, Request, Response } from "express";
import { newId } from "../utils/ids.js";

const HEADER = "x-request-id";
const SAFE_ID = /^[A-Za-z0-9_-]{8,128}$/;

export function requestId() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.header(HEADER);
    req.id = incoming && SAFE_ID.test(incoming) ? incoming : newId();
    res.setHeader(HEADER, req.id);
    req.validated = { body: undefined, query: undefined, params: undefined };
    next();
  };
}

/** pino-http widens `req.id`; the API always exposes it as a string. */
export function reqId(req: Request): string {
  return typeof req.id === "string" ? req.id : String(req.id ?? "unknown");
}
