import { randomUUID } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const storageDirectory = join(process.cwd(), 'storage');

export const saveUploadedFile = async (file: File) => {
    await mkdir(storageDirectory, { recursive: true });

    const fileName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(file.name)}`;
    const storagePath = join('storage', fileName);
    const absolutePath = join(process.cwd(), storagePath);

    await Bun.write(absolutePath, file);

    return storagePath;
};

export const deleteStoredFile = async (storagePath: string) => {
    try {
        await unlink(join(process.cwd(), storagePath));
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            return;
        }

        throw error;
    }
};

const sanitizeFileName = (fileName: string) => {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
};
