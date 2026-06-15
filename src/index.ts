import 'dotenv/config';
import { Elysia } from 'elysia';
import { HttpError } from './common/http-error';
import { errorResponse } from './common/http-response';
import { FileController } from './modules/file/file.controller';
import { FileRepository } from './modules/file/file.repository';
import { FileService } from './modules/file/file.service';
import { FolderRepository } from './modules/folder/folder.repository';
import { FolderService } from './modules/folder/folder.service';
import { FolderController } from './modules/folder/folder.controller';

const app = new Elysia();
const port = Number(process.env.PORT ?? 3000);

const folderRepository = new FolderRepository();
const folderService = new FolderService(folderRepository);
const folderController = new FolderController(folderService);

const fileRepository = new FileRepository();
const fileService = new FileService(fileRepository, folderRepository);
const fileController = new FileController(fileService);

app.onError(({ error, set }) => {
    if (error instanceof HttpError) {
        set.status = error.statusCode;

        return errorResponse(error.message, error.details);
    }

    set.status = 500;

    return errorResponse('Internal server error');
});

folderController.register(app, '/api/v1');
fileController.register(app, '/api/v1');
folderController.register(app);
fileController.register(app);

app.listen(port);

console.log(`Server running on port ${port}`);
