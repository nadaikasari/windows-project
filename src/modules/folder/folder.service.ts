import { badRequest, notFound } from '../../common/http-error';
import { FolderRepository, type UpdateFolderData } from './folder.repository';

export type CreateFolderInput = {
    name?: unknown;
    parentId?: unknown;
};

export type UpdateFolderInput = {
    name?: unknown;
    parentId?: unknown;
};

type FolderNode = {
    id: number;
    name: string;
    parentId: number | null;
    children: FolderNode[];
};

export class FolderService {
    constructor(private readonly folderRepository: FolderRepository) {}

    getAllFolders() {
        return this.folderRepository.findAll();
    }

    async getFolderById(id: number) {
        const folder = await this.folderRepository.findById(id);

        if (!folder) {
            throw notFound('Folder');
        }

        return folder;
    }

    async getFoldersByParentId(parentId: number | null) {
        if (parentId !== null) {
            await this.ensureFolderExists(parentId);
        }

        return this.folderRepository.findByParentId(parentId);
    }

    async createFolder(input: CreateFolderInput) {
        const data = await this.toCreateData(input);

        return this.folderRepository.create(data);
    }

    async updateFolder(id: number, input: UpdateFolderInput) {
        await this.getFolderById(id);

        const data = await this.toUpdateData(id, input);

        if (Object.keys(data).length === 0) {
            throw badRequest('At least one field must be provided');
        }

        return this.folderRepository.update(id, data);
    }

    async deleteFolder(id: number) {
        await this.getFolderById(id);
        const descendantIds = await this.folderRepository.findDescendantIds(id);

        await this.folderRepository.deleteMany([id, ...descendantIds]);
    }

    async getFolderTree() {
        const folders = await this.folderRepository.findAll();

        const folderMap = new Map<number, FolderNode>();

        folders.forEach((folder) => {
            folderMap.set(folder.id, {
                id: folder.id,
                name: folder.name,
                parentId: folder.parentId,
                children: []
            });
        });

        const roots: FolderNode[] = [];

        folderMap.forEach((folder) => {
            if (folder.parentId) {
                const parent = folderMap.get(folder.parentId);
                parent?.children.push(folder);
                return;
            }

            roots.push(folder);
        });

        // Sort function (A-Z)
        const sortByName = (a: FolderNode, b: FolderNode) =>
            a.name.localeCompare(b.name);

        // Recursive sort for tree
        const sortTree = (nodes: FolderNode[]) => {
            nodes.sort(sortByName);

            nodes.forEach((node) => {
                if (node.children.length > 0) {
                    sortTree(node.children);
                }
            });
        };

        sortTree(roots);

        return roots;
    }

    private async toCreateData(input: CreateFolderInput) {
        const name = this.validateName(input.name);
        const parentId = await this.validateParentId(input.parentId ?? null);

        return { name, parentId };
    }

    private async toUpdateData(id: number, input: UpdateFolderInput) {
        const data: UpdateFolderData = {};

        if ('name' in input) {
            data.name = this.validateName(input.name);
        }

        if ('parentId' in input) {
            if (input.parentId === id) {
                throw badRequest('Folder cannot be its own parent');
            }

            const parentId = await this.validateParentId(input.parentId ?? null);

            if (parentId !== null) {
                await this.ensureParentDoesNotCreateCycle(id, parentId);
            }

            data.parentId = parentId;
        }

        return data;
    }

    private validateName(name: unknown) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw badRequest('Folder name is required');
        }

        return name.trim();
    }

    private async validateParentId(parentId: unknown) {
        if (parentId === null) {
            return null;
        }

        const id = Number(parentId);

        if (!Number.isInteger(id) || id <= 0) {
            throw badRequest('Parent folder ID must be a positive integer');
        }

        const parentExists = await this.folderRepository.exists(id);

        if (!parentExists) {
            throw notFound('Parent folder');
        }

        return id;
    }

    private async ensureFolderExists(id: number) {
        const folderExists = await this.folderRepository.exists(id);

        if (!folderExists) {
            throw notFound('Folder');
        }
    }

    private async ensureParentDoesNotCreateCycle(folderId: number, parentId: number) {
        const folders = await this.folderRepository.findAll();
        const parentByFolderId = new Map(folders.map((folder) => [folder.id, folder.parentId]));

        let currentParentId: number | null | undefined = parentId;

        while (currentParentId) {
            if (currentParentId === folderId) {
                throw badRequest('Parent folder cannot be one of its descendants');
            }

            currentParentId = parentByFolderId.get(currentParentId);
        }
    }
}
