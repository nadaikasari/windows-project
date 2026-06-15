<script setup lang="ts">
import { ChevronDown, ChevronRight, Folder } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import type { FolderNode } from '../types/explorer';

const props = defineProps<{
    folder: FolderNode;
    selectedFolderId: number | null;
    searchTerm: string;
}>();

const emit = defineEmits<{
    select: [folder: FolderNode];
    contextMenu: [event: MouseEvent, folder: FolderNode];
}>();

const isOpen = ref(true);

const isSelected = computed(() => props.selectedFolderId === props.folder.id);
const hasChildren = computed(() => props.folder.children.length > 0);
const matchesSearch = computed(() => props.folder.name.toLowerCase().includes(props.searchTerm.toLowerCase()));
const hasMatchingDescendant = computed(() => hasMatch(props.folder.children, props.searchTerm));
const isVisible = computed(() => !props.searchTerm || matchesSearch.value || hasMatchingDescendant.value);

watch(
    () => props.searchTerm,
    (searchTerm) => {
        if (searchTerm && hasMatchingDescendant.value) {
            isOpen.value = true;
        }
    }
);

const toggle = () => {
    if (hasChildren.value) {
        isOpen.value = !isOpen.value;
    }
};

const selectFolder = () => {
    emit('select', props.folder);
};

const openContextMenu = (event: MouseEvent) => {
    emit('contextMenu', event, props.folder);
};

const hasMatch = (folders: FolderNode[], searchTerm: string): boolean => {
    if (!searchTerm) {
        return true;
    }

    const normalizedSearch = searchTerm.toLowerCase();

    return folders.some((folder) => {
        return folder.name.toLowerCase().includes(normalizedSearch) || hasMatch(folder.children, searchTerm);
    });
};
</script>

<template>
    <li v-if="isVisible" class="tree-item">
        <div
            class="tree-row"
            :class="{ selected: isSelected }"
            @click="selectFolder"
            @contextmenu.prevent="openContextMenu"
        >
            <button
                class="toggle-button"
                type="button"
                :aria-label="isOpen ? 'Collapse folder' : 'Expand folder'"
                :disabled="!hasChildren"
                @click.stop="toggle"
            >
                <ChevronDown v-if="hasChildren && isOpen" aria-hidden="true" />
                <ChevronRight v-else-if="hasChildren" aria-hidden="true" />
            </button>
            <Folder class="folder-icon" aria-hidden="true" />
            <span class="folder-name">{{ folder.name }}</span>
        </div>

        <ul v-if="hasChildren && isOpen" class="tree-children">
            <FolderTreeItem
                v-for="child in folder.children"
                :key="child.id"
                :folder="child"
                :selected-folder-id="selectedFolderId"
                :search-term="searchTerm"
                @select="emit('select', $event)"
                @context-menu="(event, folder) => emit('contextMenu', event, folder)"
            />
        </ul>
    </li>
</template>
