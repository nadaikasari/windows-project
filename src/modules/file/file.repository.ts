import { prisma } from '../../database/prisma';

export type CreateFileData = {
    name: string;
    extension: string;
    mimeType: string;
    size: number;
    storagePath: string;
    folderId: number;
};

export type UpdateFileData = {
    name?: string;
};

export class FileRepository {
    findAll() {
        return prisma.file.findMany({
            orderBy: [
                { folderId: 'asc' },
                { name: 'asc' }
            ]
        });
    }

    findById(id: number) {
        return prisma.file.findUnique({
            where: { id }
        });
    }

    findByFolderId(folderId: number) {
        return prisma.file.findMany({
            where: { folderId },
            orderBy: { name: 'asc' }
        });
    }

    create(data: CreateFileData) {
        return prisma.file.create({ data });
    }

    update(id: number, data: UpdateFileData) {
        return prisma.file.update({
            where: { id },
            data
        });
    }

    delete(id: number) {
        return prisma.file.delete({
            where: { id }
        });
    }
}
