-- AlterTable
ALTER TABLE "files"
ADD COLUMN "extension" TEXT NOT NULL DEFAULT '',
ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
ADD COLUMN "size" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "storagePath" TEXT NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
