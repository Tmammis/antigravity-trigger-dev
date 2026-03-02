import type { TriggerConfig } from "@trigger.dev/sdk/v3";
import "dotenv/config";

export const config: TriggerConfig = {
    project: "proj_euogxzipubkcafdoicnx",
    maxDuration: 300, // 5 minutes
    logLevel: "log",
    retries: {
        enabledInDev: true,
        default: {
            maxAttempts: 3,
            minTimeoutInMs: 1000,
            maxTimeoutInMs: 10000,
            factor: 2,
            randomize: true,
        },
    },
};
