export type Folder = {
    id: number;
    name: string;
    parentId: number | null;
    createdAt: string;
    updatedAt: string;
};

export type FolderNode = Folder & {
    children: FolderNode[];
};

export type FileItem = {
    id: number;
    folderId: number;
    name: string;
    extension: string;
    mimeType: string;
    size: number;
    storagePath: string;
    createdAt: string;
    updatedAt: string;
};

export type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};
