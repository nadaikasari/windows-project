import { badRequest } from './http-error';

export const parsePositiveInteger = (value: string, fieldName = 'ID') => {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw badRequest(`${fieldName} must be a positive integer`);
    }

    return id;
};

export const parseObjectBody = async (body: unknown, request?: Request) => {
    const parsedBody = await resolveBody(body, request);

    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
        throw badRequest('Request body must be an object');
    }

    return parsedBody as Record<string, unknown>;
};

export const parseRequestBody = async (body: unknown, request: Request) => {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
        return body as Record<string, unknown>;
    }

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();

        return Object.fromEntries(formData.entries()) as Record<string, unknown>;
    }

    return parseObjectBody(body, request);
};

const resolveBody = async (body: unknown, request?: Request) => {
    if (body !== undefined && body !== null) {
        return typeof body === 'string' ? parseJsonBody(body) : body;
    }

    if (!request) {
        return body;
    }

    const rawBody = await request.text();

    if (!rawBody.trim()) {
        return null;
    }

    return parseJsonBody(rawBody);
};

const parseJsonBody = (body: string) => {
    try {
        return JSON.parse(body);
    } catch {
        throw badRequest('Request body must be valid JSON');
    }
};
