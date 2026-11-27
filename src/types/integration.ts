/** 基础配置与运行开关都生效时，当前环境才可处理对应方向。 */
export interface IntegrationRuntime {
  environment: "dev" | "prod" | "local";
  version: number;
  inboundAvailable: boolean;
  outboundAvailable: boolean;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
}

/** 每次只提交一个开关和当前版本。 */
export type IntegrationRuntimeInput =
  | { version: number; inboundEnabled: boolean }
  | { version: number; outboundEnabled: boolean };

export interface IntegrationActivity {
  state: "disabled" | "starting" | "running" | "stalled" | "error" | "stopped" | "paused";
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastErrorAt: string | null;
}
