import type { ApiResponse, FileItem, Folder, FolderNode } from '../types/explorer';

const API_BASE_URL = '/api/v1';

export const explorerApi = {
    getFolderTree: () => get<FolderNode[]>('/folders/tree'),
    getFolderChildren: (folderId: number) => get<Folder[]>(`/folders/${folderId}/children`),
    getFolderFiles: (folderId: number) => get<FileItem[]>(`/folders/${folderId}/files`),
    createFolder: (name: string, parentId: number | null) => postFolder<Folder>('/folders', { name, parentId }),
    deleteFolder: (folderId: number) => deleteResource<null>(`/folders/${folderId}`),
    uploadFile: (folderId: number, file: File, name?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', String(folderId));

        if (name?.trim()) {
            formData.append('name', name.trim());
        }

        return postMultipart<FileItem>('/files', formData);
    },
    updateFile: (fileId: number, name: string) => patch<FileItem>(`/files/${fileId}`, { name }),
    deleteFile: (fileId: number) => deleteResource<null>(`/files/${fileId}`)
};

const get = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${path}`);
    const payload = await response.json() as ApiResponse<T>;

    if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to load explorer data');
    }

    return payload.data;
};

const postFolder = async <T>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    return parseResponse<T>(response);
};

const postMultipart = async <T>(path: string, body: FormData): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        body
    });

    return parseResponse<T>(response);
};

const patch = async <T>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    return parseResponse<T>(response);
};

const deleteResource = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'DELETE'
    });

    return parseResponse<T>(response);
};

const parseResponse = async <T>(response: Response): Promise<T> => {
    const payload = await response.json() as ApiResponse<T>;

    if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Explorer request failed');
    }

    return payload.data;
};
