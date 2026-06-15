import type { Elysia } from 'elysia';
import { successResponse } from '../../common/http-response';
import { parseObjectBody, parsePositiveInteger, parseRequestBody } from '../../common/request';
import { FileService } from './file.service';

type ResponseSet = {
    status?: number | string;
};

export class FileController {
    constructor(private readonly fileService: FileService) {}

    register(app: Elysia, basePath = '') {
        app.get(`${basePath}/files`, this.getAll.bind(this));
        app.get(`${basePath}/files/:id`, this.getById.bind(this));
        app.get(`${basePath}/folders/:id/files`, this.getByFolderId.bind(this));
        app.post(`${basePath}/files`, this.create.bind(this));
        app.patch(`${basePath}/files/:id`, this.update.bind(this));
        app.delete(`${basePath}/files/:id`, this.delete.bind(this));
    }

    async getAll() {
        const files = await this.fileService.getAllFiles();

        return successResponse('Files retrieved successfully', files);
    }

    async getById({ params }: { params: { id: string } }) {
        const file = await this.fileService.getFileById(parsePositiveInteger(params.id));

        return successResponse('File retrieved successfully', file);
    }

    async getByFolderId({ params }: { params: { id: string } }) {
        const files = await this.fileService.getFilesByFolderId(parsePositiveInteger(params.id, 'Folder ID'));

        return successResponse('Folder files retrieved successfully', files);
    }

    async create({ body, request, set }: { body: unknown; request: Request; set: ResponseSet }) {
        const file = await this.fileService.createFile(await parseRequestBody(body, request));
        set.status = 201;

        return successResponse('File created successfully', file);
    }

    async update({ params, body, request }: { params: { id: string }; body: unknown; request: Request }) {
        const file = await this.fileService.updateFile(
            parsePositiveInteger(params.id),
            await parseObjectBody(body, request)
        );

        return successResponse('File updated successfully', file);
    }

    async delete({ params, set }: { params: { id: string }; set: ResponseSet }) {
        await this.fileService.deleteFile(parsePositiveInteger(params.id));

        return successResponse('File deleted successfully', null);
    }
}
