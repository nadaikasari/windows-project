export class HttpError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, details);
export const notFound = (resource: string) => new HttpError(404, `${resource} not found`);
