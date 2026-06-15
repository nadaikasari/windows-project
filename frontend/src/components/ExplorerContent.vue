<script setup lang="ts">
import { File, Folder as FolderIcon } from 'lucide-vue-next';
import type { FileItem, Folder } from '../types/explorer';

defineProps<{
    selectedFolder: Folder | null;
    folders: Folder[];
    files: FileItem[];
    loading: boolean;
}>();

const emit = defineEmits<{
    panelContextMenu: [event: MouseEvent];
    fileContextMenu: [event: MouseEvent, file: FileItem];
}>();
</script>

<template>
    <section class="content-panel" @contextmenu.self.prevent="emit('panelContextMenu', $event)">
        <div v-if="!selectedFolder" class="empty-state centered">
            <p>Select a folder from the tree to view its direct contents.</p>
        </div>

        <template v-else>
            <header class="content-header">
                <div>
                    <h2>{{ selectedFolder.name }}</h2>
                </div>
            </header>

            <div v-if="loading" class="empty-state">
                <p>Loading folder contents...</p>
            </div>

            <div v-else class="item-grid" @contextmenu.self.prevent="emit('panelContextMenu', $event)">
                <button
                    v-for="folder in folders"
                    :key="`folder-${folder.id}`"
                    class="explorer-item"
                    type="button"
                >
                    <FolderIcon class="item-folder-icon" aria-hidden="true" />
                    <span>{{ folder.name }}</span>
                </button>

                <button
                    v-for="file in files"
                    :key="`file-${file.id}`"
                    class="explorer-item"
                    type="button"
                    @contextmenu.prevent="emit('fileContextMenu', $event, file)"
                >
                    <File class="item-file-icon" aria-hidden="true" />
                    <span>{{ file.name }}.{{ file.extension }}</span>
                </button>

                <div
                    v-if="folders.length === 0 && files.length === 0"
                    class="empty-state inline"
                    @contextmenu.prevent="emit('panelContextMenu', $event)"
                >
                    <p>This folder is empty.</p>
                </div>
            </div>
        </template>
    </section>
</template>
