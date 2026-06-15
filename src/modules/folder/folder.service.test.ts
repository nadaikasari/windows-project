import { describe, expect, it } from 'bun:test';
import { HttpError } from '../../common/http-error';
import type { CreateFolderData, FolderRepository, UpdateFolderData } from './folder.repository';
import { FolderService } from './folder.service';

type FolderRecord = {
    id: number;
    name: string;
    parentId: number | null;
    createdAt: Date;
    updatedAt: Date;
};

const now = new Date('2026-06-14T00:00:00.000Z');

const folder = (id: number, name: string, parentId: number | null = null): FolderRecord => ({
    id,
    name,
    parentId,
    createdAt: now,
    updatedAt: now
});

const createFolderRepository = (initialFolders: FolderRecord[] = []) => {
    const state = {
        folders: [...initialFolders],
        createdWith: null as CreateFolderData | null,
        updatedWith: null as { id: number; data: UpdateFolderData } | null,
        deletedIds: [] as number[]
    };

    const repository = {
        findAll: async () => [...state.folders],
        findById: async (id: number) => state.folders.find((item) => item.id === id) ?? null,
        findByParentId: async (parentId: number | null) =>
            state.folders.filter((item) => item.parentId === parentId),
        create: async (data: CreateFolderData) => {
            state.createdWith = data;

            const created = folder(99, data.name, data.parentId);
            state.folders.push(created);

            return created;
        },
        update: async (id: number, data: UpdateFolderData) => {
            state.updatedWith = { id, data };

            const existing = state.folders.find((item) => item.id === id);
            if (!existing) {
                throw new Error('Missing test folder');
            }

            Object.assign(existing, data);

            return existing;
        },
        exists: async (id: number) => state.folders.some((item) => item.id === id),
        delete: async (id: number) => {
            state.deletedIds = [id];
        },
        deleteMany: async (ids: number[]) => {
            state.deletedIds = ids;
            state.folders = state.folders.filter((item) => !ids.includes(item.id));
        },
        findDescendantIds: async (parentId: number) => {
            const childrenByParentId = new Map<number, number[]>();

            state.folders.forEach((item) => {
                if (item.parentId === null) {
                    return;
                }

                const children = childrenByParentId.get(item.parentId) ?? [];
                children.push(item.id);
                childrenByParentId.set(item.parentId, children);
            });

            const descendantIds: number[] = [];
            const queue = [...(childrenByParentId.get(parentId) ?? [])];

            while (queue.length > 0) {
                const currentId = queue.shift();

                if (!currentId) {
                    continue;
                }

                descendantIds.push(currentId);
                queue.push(...(childrenByParentId.get(currentId) ?? []));
            }

            return descendantIds;
        }
    };

    return {
        repository: repository as unknown as FolderRepository,
        state
    };
};

describe('FolderService', () => {
    it('builds a sorted recursive folder tree', async () => {
        const { repository } = createFolderRepository([
            folder(1, 'Documents'),
            folder(2, 'Pictures'),
            folder(3, 'Work', 1),
            folder(4, 'Archive', 1),
            folder(5, 'Receipts', 4),
            folder(6, 'Applications')
        ]);

        const service = new FolderService(repository);
        const tree = await service.getFolderTree();
        const documents = tree.find((item) => item.name === 'Documents');
        const archive = documents?.children.find((item) => item.name === 'Archive');

        if (!documents || !archive) {
            throw new Error('Expected test tree to contain Documents > Archive');
        }

        expect(tree.map((item) => item.name)).toEqual(['Applications', 'Documents', 'Pictures']);
        expect(documents.children.map((item) => item.name)).toEqual(['Archive', 'Work']);
        expect(archive.children).toEqual([
            {
                id: 5,
                name: 'Receipts',
                parentId: 4,
                children: []
            }
        ]);
    });

    it('creates a root folder with a trimmed name', async () => {
        const { repository, state } = createFolderRepository();
        const service = new FolderService(repository);

        const created = await service.createFolder({
            name: '  Projects  ',
            parentId: null
        });

        expect(created.name).toBe('Projects');
        expect(created.parentId).toBeNull();
        expect(state.createdWith).toEqual({
            name: 'Projects',
            parentId: null
        });
    });

    it('rejects a folder when the parent does not exist', async () => {
        const { repository } = createFolderRepository();
        const service = new FolderService(repository);

        await expect(service.createFolder({ name: 'Drafts', parentId: 123 })).rejects.toThrow(HttpError);
        await expect(service.createFolder({ name: 'Drafts', parentId: 123 })).rejects.toThrow(
            'Parent folder not found'
        );
    });

    it('prevents moving a folder into one of its descendants', async () => {
        const { repository } = createFolderRepository([
            folder(1, 'Parent'),
            folder(2, 'Child', 1),
            folder(3, 'Grandchild', 2)
        ]);
        const service = new FolderService(repository);

        await expect(service.updateFolder(1, { parentId: 3 })).rejects.toThrow(
            'Parent folder cannot be one of its descendants'
        );
    });

    it('deletes a folder with all descendants', async () => {
        const { repository, state } = createFolderRepository([
            folder(1, 'Parent'),
            folder(2, 'Child', 1),
            folder(3, 'Grandchild', 2),
            folder(4, 'Sibling')
        ]);
        const service = new FolderService(repository);

        await service.deleteFolder(1);

        expect(state.deletedIds).toEqual([1, 2, 3]);
        expect(state.folders.map((item) => item.id)).toEqual([4]);
    });
});
