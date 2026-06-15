import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    await prisma.folder.createMany({
        data: [
            { name: 'Documents', parentId: null },
            { name: 'Downloads', parentId: null },
            { name: 'Applications', parentId: null },
            { name: 'Desktop', parentId: null },
            { name: 'Pictures', parentId: null },
            { name: 'Labuan Bajo', parentId: 5 },
            { name: 'Bali', parentId: 5 },
            { name: 'Bandung', parentId: 5 },
            { name: 'Work', parentId: 1 },
            { name: 'Others', parentId: 1 },
        ]
    });
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
