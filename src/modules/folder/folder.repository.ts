import { prisma } from '../../database/prisma';

export type CreateFolderData = {
    name: string;
    parentId: number | null;
};

export type UpdateFolderData = Partial<CreateFolderData>;

export class FolderRepository {
    findAll() {
        return prisma.folder.findMany({
            orderBy: [
                { parentId: 'asc' },
                { name: 'asc' }
            ]
        });
    }

    findById(id: number) {
        return prisma.folder.findUnique({
            where: { id }
        });
    }

    findByParentId(parentId: number | null) {
        return prisma.folder.findMany({
            where: { parentId },
            orderBy: { name: 'asc' }
        });
    }

    create(data: CreateFolderData) {
        return prisma.folder.create({ data });
    }

    update(id: number, data: UpdateFolderData) {
        return prisma.folder.update({
            where: { id },
            data
        });
    }

    async exists(id: number) {
        const count = await prisma.folder.count({
            where: { id }
        });

        return count > 0;
    }

    async deleteMany(ids: number[]) {
        await prisma.$transaction([
            prisma.file.deleteMany({
                where: {
                    folderId: { in: ids }
                }
            }),
            prisma.folder.deleteMany({
                where: {
                    id: { in: ids }
                }
            })
        ]);
    }

    async delete(id: number) {
        await prisma.$transaction([
            prisma.file.deleteMany({
                where: { folderId: id }
            }),
            prisma.folder.delete({
                where: { id }
            })
        ]);
    }

    async findDescendantIds(parentId: number) {
        const folders = await prisma.folder.findMany({
            select: {
                id: true,
                parentId: true
            }
        });

        const childrenByParentId = new Map<number, number[]>();

        folders.forEach((folder) => {
            if (folder.parentId === null) {
                return;
            }

            const children = childrenByParentId.get(folder.parentId) ?? [];
            children.push(folder.id);
            childrenByParentId.set(folder.parentId, children);
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
}
