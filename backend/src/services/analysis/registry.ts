import { analysisTypes, type AnalysisType } from "@pedago/shared";
import type { AnyAnalysisHandler } from "./types.js";

/** Exactly one handler per AnalysisType; registration is validated at startup. */
export class AnalysisRegistry {
  private readonly handlers = new Map<AnalysisType, AnyAnalysisHandler>();

  register(handler: AnyAnalysisHandler): this {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Duplicate analysis handler registered for ${handler.type}`);
    }
    this.handlers.set(handler.type, handler);
    return this;
  }

  get(type: AnalysisType): AnyAnalysisHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No analysis handler registered for ${type}`);
    }
    return handler;
  }

  has(type: AnalysisType): boolean {
    return this.handlers.has(type);
  }

  assertComplete(): void {
    const missing = analysisTypes.filter((type) => !this.handlers.has(type));
    if (missing.length > 0) {
      throw new Error(`Missing analysis handlers: ${missing.join(", ")}`);
    }
  }

  types(): AnalysisType[] {
    return [...this.handlers.keys()];
  }
}
