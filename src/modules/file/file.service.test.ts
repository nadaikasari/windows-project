import { describe, expect, it } from 'bun:test';
import type { FolderRepository } from '../folder/folder.repository';
import type { CreateFileData, FileRepository, UpdateFileData } from './file.repository';
import { FileService } from './file.service';

type FileRecord = {
    id: number;
    folderId: number;
    name: string;
    extension: string;
    mimeType: string;
    size: number;
    storagePath: string;
    createdAt: Date;
    updatedAt: Date;
};

const now = new Date('2026-06-14T00:00:00.000Z');

const file = (id: number, name: string, folderId: number): FileRecord => ({
    id,
    folderId,
    name,
    extension: 'txt',
    mimeType: 'text/plain',
    size: 12,
    storagePath: `storage/${name}`,
    createdAt: now,
    updatedAt: now
});

const createFileRepository = (initialFiles: FileRecord[] = []) => {
    const state = {
        files: [...initialFiles],
        createdWith: null as CreateFileData | null,
        updatedWith: null as { id: number; data: UpdateFileData } | null,
        deletedId: null as number | null
    };

    const repository = {
        findAll: async () => [...state.files],
        findById: async (id: number) => state.files.find((item) => item.id === id) ?? null,
        findByFolderId: async (folderId: number) => state.files.filter((item) => item.folderId === folderId),
        create: async (data: CreateFileData) => {
            state.createdWith = data;

            const created = {
                id: 99,
                ...data,
                createdAt: now,
                updatedAt: now
            };
            state.files.push(created);

            return created;
        },
        update: async (id: number, data: UpdateFileData) => {
            state.updatedWith = { id, data };

            const existing = state.files.find((item) => item.id === id);
            if (!existing) {
                throw new Error('Missing test file');
            }

            Object.assign(existing, data);

            return existing;
        },
        delete: async (id: number) => {
            state.deletedId = id;
            state.files = state.files.filter((item) => item.id !== id);
        }
    };

    return {
        repository: repository as unknown as FileRepository,
        state
    };
};

const createFolderRepository = (existingFolderIds: number[]) => {
    const repository = {
        exists: async (id: number) => existingFolderIds.includes(id)
    };

    return repository as unknown as FolderRepository;
};

const createFileStorage = () => {
    const state = {
        savedFile: null as File | null,
        deletedPath: null as string | null
    };

    return {
        storage: {
            save: async (uploadedFile: File) => {
                state.savedFile = uploadedFile;

                return 'storage/generated-notes.txt';
            },
            delete: async (storagePath: string) => {
                state.deletedPath = storagePath;
            }
        },
        state
    };
};

describe('FileService', () => {
    it('creates a file with a trimmed name when the folder exists', async () => {
        const { repository, state } = createFileRepository();
        const folderRepository = createFolderRepository([7]);
        const { storage, state: storageState } = createFileStorage();
        const service = new FileService(repository, folderRepository, storage);

        const created = await service.createFile({
            name: '  notes.txt  ',
            folderId: '7',
            file: new File(['hello world'], 'notes.txt', { type: 'text/plain' })
        });

        expect(created).toMatchObject({
            id: 99,
            name: 'notes.txt',
            folderId: 7,
            extension: 'txt',
            mimeType: 'text/plain;charset=utf-8',
            size: 11,
            storagePath: 'storage/generated-notes.txt'
        });
        expect(state.createdWith).toEqual({
            name: 'notes.txt',
            extension: 'txt',
            mimeType: 'text/plain;charset=utf-8',
            size: 11,
            storagePath: 'storage/generated-notes.txt',
            folderId: 7
        });
        expect(storageState.savedFile?.name).toBe('notes.txt');
    });

    it('rejects create when the target folder does not exist', async () => {
        const { repository } = createFileRepository();
        const folderRepository = createFolderRepository([]);
        const service = new FileService(repository, folderRepository);

        await expect(
            service.createFile({
                name: 'notes.txt',
                folderId: 7,
                file: new File(['hello'], 'notes.txt')
            })
        ).rejects.toThrow('Folder not found');
    });

    it('returns files by folder id after validating the folder exists', async () => {
        const { repository } = createFileRepository([
            file(1, 'a.txt', 10),
            file(2, 'b.txt', 10),
            file(3, 'c.txt', 11)
        ]);
        const folderRepository = createFolderRepository([10]);
        const service = new FileService(repository, folderRepository);

        const files = await service.getFilesByFolderId(10);

        expect(files.map((item) => item.name)).toEqual(['a.txt', 'b.txt']);
    });

    it('updates a file and rejects empty update payloads', async () => {
        const { repository, state } = createFileRepository([file(1, 'old.txt', 10)]);
        const folderRepository = createFolderRepository([10, 11]);
        const service = new FileService(repository, folderRepository);

        const updated = await service.updateFile(1, {
            name: '  new.txt '
        });

        expect(updated).toMatchObject({
            id: 1,
            name: 'new.txt',
            folderId: 10
        });
        expect(state.updatedWith).toEqual({
            id: 1,
            data: {
                name: 'new.txt'
            }
        });

        await expect(service.updateFile(1, {})).rejects.toThrow('At least one field must be provided');
    });

    it('deletes an existing file', async () => {
        const { repository, state } = createFileRepository([file(1, 'notes.txt', 10)]);
        const folderRepository = createFolderRepository([10]);
        const { storage, state: storageState } = createFileStorage();
        const service = new FileService(repository, folderRepository, storage);

        await service.deleteFile(1);

        expect(state.deletedId).toBe(1);
        expect(state.files).toEqual([]);
        expect(storageState.deletedPath).toBe('storage/notes.txt');
    });
});
