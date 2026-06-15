<script setup lang="ts">
    import { FilePenLine, FilePlus2, Plus, RefreshCw, Search, Trash2 } from 'lucide-vue-next';
    import { onMounted, ref } from 'vue';
    import ExplorerContent from './components/ExplorerContent.vue';
    import FolderTreeItem from './components/FolderTreeItem.vue';
    import { explorerApi } from './services/explorerApi';
    import type { FileItem, Folder, FolderNode } from './types/explorer';

    const folderTree = ref<FolderNode[]>([]);
    const selectedFolder = ref<Folder | null>(null);
    const childFolders = ref<Folder[]>([]);
    const files = ref<FileItem[]>([]);
    const searchKeyword = ref('');
    const loadingTree = ref(false);
    const loadingContent = ref(false);
    const errorMessage = ref('');

    const contextMenu = ref<{
        folder: FolderNode | null;
        x: number;
        y: number;
    } | null>(null);

    const createDialog = ref<{
        parent: FolderNode | null;
        name: string;
    } | null>(null);

    const deleteDialog = ref<{
        folder: FolderNode;
    } | null>(null);

    const contentContextMenu = ref<{
        file: FileItem | null;
        x: number;
        y: number;
    } | null>(null);

    const uploadDialog = ref<{
        file: File | null;
        name: string;
    } | null>(null);

    const renameFileDialog = ref<{
        file: FileItem;
        name: string;
    } | null>(null);

    const deleteFileDialog = ref<{
        file: FileItem;
    } | null>(null);

    onMounted(async () => {
        await loadFolderTree();
    });

    const loadFolderTree = async () => {
        loadingTree.value = true;
        errorMessage.value = '';

        try {
            folderTree.value = await explorerApi.getFolderTree();
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
        } finally {
            loadingTree.value = false;
        }
    };

    const selectFolder = async (folder: FolderNode) => {
        selectedFolder.value = folder;
        loadingContent.value = true;
        errorMessage.value = '';

        try {
            const [foldersResult, filesResult] = await Promise.all([
                explorerApi.getFolderChildren(folder.id),
                explorerApi.getFolderFiles(folder.id)
            ]);

            childFolders.value = foldersResult;
            files.value = filesResult;
        } catch (error) {
            childFolders.value = [];
            files.value = [];
            errorMessage.value = getErrorMessage(error);
        } finally {
            loadingContent.value = false;
        }
    };

    const openFolderContextMenu = (event: MouseEvent, folder: FolderNode) => {
        contextMenu.value = {
            folder,
            x: event.clientX,
            y: event.clientY
        };
    };

    const openRootContextMenu = (event: MouseEvent) => {
        contextMenu.value = {
            folder: null,
            x: event.clientX,
            y: event.clientY
        };
    };

    const closeContextMenu = () => {
        contextMenu.value = null;
        contentContextMenu.value = null;
    };

    const openCreateRootDialog = () => {
        closeContextMenu();
        createDialog.value = {
            parent: null,
            name: ''
        };
    };

    const createChildFolder = async () => {
        const targetFolder = contextMenu.value?.folder ?? null;
        closeContextMenu();

        if (targetFolder === null) {
            openCreateRootDialog();
            return;
        }

        createDialog.value = {
            parent: targetFolder,
            name: ''
        };
    };

    const submitCreateChildFolder = async () => {
        const dialog = createDialog.value;

        if (!dialog?.name.trim()) {
            return;
        }

        errorMessage.value = '';

        try {
            await explorerApi.createFolder(dialog.name.trim(), dialog.parent?.id ?? null);
            await loadFolderTree();

            if (dialog.parent) {
                await selectFolder(dialog.parent);
            }

            createDialog.value = null;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
        }
    };

    const deleteFolder = async () => {
        const targetFolder = contextMenu.value?.folder ?? null;
        closeContextMenu();

        if (!targetFolder) {
            return;
        }

        deleteDialog.value = {
            folder: targetFolder
        };
    };

    const confirmDeleteFolder = async () => {
        const dialog = deleteDialog.value;

        if (!dialog) {
            return;
        }

        errorMessage.value = '';

        try {
            await explorerApi.deleteFolder(dialog.folder.id);

            if (selectedFolder.value && containsFolder(dialog.folder, selectedFolder.value.id)) {
                selectedFolder.value = null;
                childFolders.value = [];
                files.value = [];
            }

            await loadFolderTree();
            deleteDialog.value = null;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
        }
    };

    const containsFolder = (folder: FolderNode, folderId: number): boolean => {
        return folder.id === folderId || folder.children.some((child) => containsFolder(child, folderId));
    };

    const refreshSelectedFolderContents = async () => {
        if (!selectedFolder.value) {
            return;
        }

        const [foldersResult, filesResult] = await Promise.all([
            explorerApi.getFolderChildren(selectedFolder.value.id),
            explorerApi.getFolderFiles(selectedFolder.value.id)
        ]);

        childFolders.value = foldersResult;
        files.value = filesResult;
    };

    const openContentContextMenu = (event: MouseEvent) => {
        if (!selectedFolder.value) {
            return;
        }

        contentContextMenu.value = {
            file: null,
            x: event.clientX,
            y: event.clientY
        };
    };

    const openFileContextMenu = (event: MouseEvent, file: FileItem) => {
        contentContextMenu.value = {
            file,
            x: event.clientX,
            y: event.clientY
        };
    };

    const openUploadDialog = () => {
        closeContextMenu();

        if (!selectedFolder.value) {
            return;
        }

        uploadDialog.value = {
            file: null,
            name: ''
        };
    };

    const onUploadFileChange = (event: Event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;

        if (!uploadDialog.value) {
            return;
        }

        uploadDialog.value.file = file;

        if (file && !uploadDialog.value.name.trim()) {
            uploadDialog.value.name = getFileBaseName(file.name);
        }
    };

    const submitUploadFile = async () => {
        if (!selectedFolder.value || !uploadDialog.value?.file) {
            return;
        }

        errorMessage.value = '';

        try {
            await explorerApi.uploadFile(
                selectedFolder.value.id,
                uploadDialog.value.file,
                uploadDialog.value.name
            );
            await refreshSelectedFolderContents();
            uploadDialog.value = null;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
        }
    };

    const openRenameFileDialog = () => {
        const file = contentContextMenu.value?.file;
        closeContextMenu();

        if (!file) {
            return;
        }

        renameFileDialog.value = {
            file,
            name: file.name
        };
    };

    const submitRenameFile = async () => {
        const dialog = renameFileDialog.value;

        if (!dialog?.name.trim()) {
            return;
        }

        errorMessage.value = '';

        try {
            await explorerApi.updateFile(dialog.file.id, dialog.name.trim());
            await refreshSelectedFolderContents();
            renameFileDialog.value = null;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
        }
    };

    const openDeleteFileDialog = () => {
        const file = contentContextMenu.value?.file;
        closeContextMenu();

        if (!file) {
            return;
        }

        deleteFileDialog.value = { file };
    };

    const confirmDeleteFile = async () => {
        const dialog = deleteFileDialog.value;

        if (!dialog) {
            return;
        }

        errorMessage.value = '';

        try {
            await explorerApi.deleteFile(dialog.file.id);
            await refreshSelectedFolderContents();
            deleteFileDialog.value = null;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
        }
    };

    const getFileBaseName = (fileName: string) => {
        const lastDotIndex = fileName.lastIndexOf('.');

        return lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
    };

    const getErrorMessage = (error: unknown) => {
        return error instanceof Error ? error.message : 'Something went wrong';
    };
    </script>

    <template>
        <main class="explorer-shell" @click="closeContextMenu">
            <aside class="tree-panel">
                <header class="panel-header">
                    <div>
                        <h1>Windows Explorer</h1>
                    </div>
                    <div class="toolbar-actions">
                        <button class="icon-button" type="button" @click.stop="openCreateRootDialog" title="New root folder">
                            <Plus aria-hidden="true" />
                        </button>
                        <button class="icon-button" type="button" @click="loadFolderTree" title="Refresh folders">
                            <RefreshCw aria-hidden="true" />
                        </button>
                    </div>
                </header>

                <label class="search-box">
                    <span class="search-input-wrap">
                        <Search class="search-icon" aria-hidden="true" />
                        <input v-model="searchKeyword" type="search" placeholder="Search folder name" />
                    </span>
                </label>

                <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

                <div v-if="loadingTree" class="tree-status">Loading folders...</div>

                <ul v-else class="folder-tree" @contextmenu.self.prevent="openRootContextMenu">
                    <FolderTreeItem
                        v-for="folder in folderTree"
                        :key="folder.id"
                        :folder="folder"
                        :selected-folder-id="selectedFolder?.id ?? null"
                        :search-term="searchKeyword"
                        @select="selectFolder"
                        @context-menu="openFolderContextMenu"
                    />
                    <li class="tree-empty-space" @contextmenu.prevent="openRootContextMenu"></li>
                </ul>
            </aside>

            <ExplorerContent
                :selected-folder="selectedFolder"
                :folders="childFolders"
                :files="files"
                :loading="loadingContent"
                @panel-context-menu="openContentContextMenu"
                @file-context-menu="openFileContextMenu"
            />

            <div
                v-if="contextMenu"
                class="context-menu"
                :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
                @click.stop
            >
                <button type="button" @click="createChildFolder">
                    <Plus aria-hidden="true" />
                    {{ contextMenu.folder ? 'New folder' : 'New root folder' }}
                </button>
                <button v-if="contextMenu.folder" type="button" class="danger" @click="deleteFolder">
                    <Trash2 aria-hidden="true" />
                    Delete folder
                </button>
            </div>

            <div
                v-if="contentContextMenu"
                class="context-menu"
                :style="{ left: `${contentContextMenu.x}px`, top: `${contentContextMenu.y}px` }"
                @click.stop
            >
                <button v-if="!contentContextMenu.file" type="button" @click="openUploadDialog">
                    <FilePlus2 aria-hidden="true" />
                    Upload file
                </button>
                <button v-if="contentContextMenu.file" type="button" @click="openRenameFileDialog">
                    <FilePenLine aria-hidden="true" />
                    Rename file
                </button>
                <button v-if="contentContextMenu.file" type="button" class="danger" @click="openDeleteFileDialog">
                    <Trash2 aria-hidden="true" />
                    Delete file
                </button>
            </div>

            <div v-if="createDialog" class="modal-backdrop" @click="createDialog = null">
                <form class="dialog" @click.stop @submit.prevent="submitCreateChildFolder">
                    <h2>New folder</h2>
                    <p v-if="createDialog.parent">Create a folder inside "{{ createDialog.parent.name }}".</p>
                    <p v-else>Create a folder at the root level.</p>
                    <label>
                        <span>Folder name</span>
                        <input v-model="createDialog.name" type="text" autofocus />
                    </label>
                    <div class="dialog-actions">
                        <button type="button" @click="createDialog = null">Cancel</button>
                        <button type="submit" class="primary" :disabled="!createDialog.name.trim()">Create</button>
                    </div>
                </form>
            </div>

            <div v-if="deleteDialog" class="modal-backdrop" @click="deleteDialog = null">
                <section class="dialog" @click.stop>
                    <h2>Delete folder</h2>
                    <p>
                        Delete "{{ deleteDialog.folder.name }}" and all of its subfolders?
                        This action cannot be undone.
                    </p>
                    <div class="dialog-actions">
                        <button type="button" @click="deleteDialog = null">Cancel</button>
                        <button type="button" class="danger" @click="confirmDeleteFolder">Delete</button>
                    </div>
                </section>
            </div>

            <div v-if="uploadDialog" class="modal-backdrop" @click="uploadDialog = null">
                <form class="dialog" @click.stop @submit.prevent="submitUploadFile">
                    <h2>Upload file</h2>
                    <p>Upload a file into "{{ selectedFolder?.name }}".</p>
                    <label>
                        <span>File</span>
                        <input type="file" required @change="onUploadFileChange" />
                    </label>
                    <label>
                        <span>Display name</span>
                        <input v-model="uploadDialog.name" type="text" placeholder="Optional custom name" />
                    </label>
                    <div class="dialog-actions">
                        <button type="button" @click="uploadDialog = null">Cancel</button>
                        <button type="submit" class="primary" :disabled="!uploadDialog.file">Upload</button>
                    </div>
                </form>
            </div>

            <div v-if="renameFileDialog" class="modal-backdrop" @click="renameFileDialog = null">
                <form class="dialog" @click.stop @submit.prevent="submitRenameFile">
                    <h2>Rename file</h2>
                    <p>Update the display name for "{{ renameFileDialog.file.name }}".</p>
                    <label>
                        <span>File name</span>
                        <input v-model="renameFileDialog.name" type="text" autofocus />
                    </label>
                    <div class="dialog-actions">
                        <button type="button" @click="renameFileDialog = null">Cancel</button>
                        <button type="submit" class="primary" :disabled="!renameFileDialog.name.trim()">Save</button>
                    </div>
                </form>
            </div>

            <div v-if="deleteFileDialog" class="modal-backdrop" @click="deleteFileDialog = null">
                <section class="dialog" @click.stop>
                    <h2>Delete file</h2>
                    <p>
                        Delete "{{ deleteFileDialog.file.name }}" from database and storage?
                        This action cannot be undone.
                    </p>
                    <div class="dialog-actions">
                        <button type="button" @click="deleteFileDialog = null">Cancel</button>
                        <button type="button" class="danger" @click="confirmDeleteFile">Delete</button>
                    </div>
                </section>
            </div>
        </main>
    </template>
