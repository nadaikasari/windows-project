import { badRequest, notFound } from '../../common/http-error';
import { FolderRepository } from '../folder/folder.repository';
import { FileRepository, type UpdateFileData } from './file.repository';
import { deleteStoredFile, saveUploadedFile } from './file-storage';

type FileStorage = {
    save: (file: File) => Promise<string>;
    delete: (storagePath: string) => Promise<void>;
};

export type CreateFileInput = {
    name?: unknown;
    folderId?: unknown;
    file?: unknown;
};

export type UpdateFileInput = {
    name?: unknown;
};

export class FileService {
    constructor(
        private readonly fileRepository: FileRepository,
        private readonly folderRepository: FolderRepository,
        private readonly fileStorage: FileStorage = {
            save: saveUploadedFile,
            delete: deleteStoredFile
        }
    ) {}

    getAllFiles() {
        return this.fileRepository.findAll();
    }

    async getFileById(id: number) {
        const file = await this.fileRepository.findById(id);

        if (!file) {
            throw notFound('File');
        }

        return file;
    }

    async getFilesByFolderId(folderId: number) {
        await this.ensureFolderExists(folderId);

        return this.fileRepository.findByFolderId(folderId);
    }

    async createFile(input: CreateFileInput) {
        const folderId = await this.validateFolderId(input.folderId);
        const uploadedFile = this.validateFile(input.file);
        const name = input.name === undefined ? this.getBaseName(uploadedFile.name) : this.validateName(input.name);
        const extension = this.getExtension(uploadedFile.name);
        const storagePath = await this.fileStorage.save(uploadedFile);

        return this.fileRepository.create({
            name,
            extension,
            mimeType: uploadedFile.type || 'application/octet-stream',
            size: uploadedFile.size,
            storagePath,
            folderId
        });
    }

    async updateFile(id: number, input: UpdateFileInput) {
        await this.getFileById(id);

        const data: UpdateFileData = {};

        if ('name' in input) {
            data.name = this.validateName(input.name);
        }

        if ('folderId' in input) {
            throw badRequest('Folder ID cannot be updated');
        }

        if (Object.keys(data).length === 0) {
            throw badRequest('At least one field must be provided');
        }

        return this.fileRepository.update(id, data);
    }

    async deleteFile(id: number) {
        const file = await this.getFileById(id);

        await this.fileRepository.delete(id);
        await this.fileStorage.delete(file.storagePath);
    }

    private validateName(name: unknown) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw badRequest('File name is required');
        }

        return name.trim();
    }

    private async validateFolderId(folderId: unknown) {
        const id = Number(folderId);

        if (!Number.isInteger(id) || id <= 0) {
            throw badRequest('Folder ID must be a positive integer');
        }

        await this.ensureFolderExists(id);

        return id;
    }

    private async ensureFolderExists(folderId: number) {
        const folderExists = await this.folderRepository.exists(folderId);

        if (!folderExists) {
            throw notFound('Folder');
        }
    }

    private validateFile(file: unknown) {
        if (!(file instanceof File) || file.size === 0) {
            throw badRequest('File is required');
        }

        return file;
    }

    private getBaseName(fileName: string) {
        const lastDotIndex = fileName.lastIndexOf('.');
        const baseName = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;

        return this.validateName(baseName);
    }

    private getExtension(fileName: string) {
        const lastDotIndex = fileName.lastIndexOf('.');

        if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
            return '';
        }

        return fileName.slice(lastDotIndex + 1).toLowerCase();
    }
}
