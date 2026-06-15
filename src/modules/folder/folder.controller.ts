import type { Elysia } from 'elysia';
import { successResponse } from '../../common/http-response';
import { parseObjectBody, parsePositiveInteger } from '../../common/request';
import { FolderService } from './folder.service';

type ResponseSet = {
    status?: number | string;
};

export class FolderController {
    constructor(private readonly folderService: FolderService) {}

    register(app: Elysia, basePath = '') {
        app.get(`${basePath}/folders`, this.getAll.bind(this));
        app.get(`${basePath}/folders/tree`, this.getTree.bind(this));
        app.get(`${basePath}/folders/:id`, this.getById.bind(this));
        app.get(`${basePath}/folders/:id/children`, this.getChildren.bind(this));
        app.post(`${basePath}/folders`, this.create.bind(this));
        app.patch(`${basePath}/folders/:id`, this.update.bind(this));
        app.delete(`${basePath}/folders/:id`, this.delete.bind(this));
    }

    async getAll() {
        const folders = await this.folderService.getAllFolders();

        return successResponse('Folders retrieved successfully', folders);
    }

    async getById({ params }: { params: { id: string } }) {
        const folder = await this.folderService.getFolderById(parsePositiveInteger(params.id));

        return successResponse('Folder retrieved successfully', folder);
    }

    async getChildren({ params }: { params: { id: string } }) {
        const folders = await this.folderService.getFoldersByParentId(parsePositiveInteger(params.id));

        return successResponse('Folder children retrieved successfully', folders);
    }

    async create({ body, request, set }: { body: unknown; request: Request; set: ResponseSet }) {
        const folder = await this.folderService.createFolder(await parseObjectBody(body, request));
        set.status = 201;

        return successResponse('Folder created successfully', folder);
    }

    async update({ params, body, request }: { params: { id: string }; body: unknown; request: Request }) {
        const folder = await this.folderService.updateFolder(
            parsePositiveInteger(params.id),
            await parseObjectBody(body, request)
        );

        return successResponse('Folder updated successfully', folder);
    }

    async delete({ params, set }: { params: { id: string }; set: ResponseSet }) {
        await this.folderService.deleteFolder(parsePositiveInteger(params.id));

        return successResponse('Folder deleted successfully', null);
    }

    async getTree() {
        const tree = await this.folderService.getFolderTree();

        return successResponse('Folder tree retrieved successfully', tree);
    }

}
