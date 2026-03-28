import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/** Valida que el folder no contenga segmentos de path traversal */
function sanitizeFolder(folder: string): string {
  // Elimina cualquier intento de salir del directorio base
  const safe = folder.replace(/\.\./g, '').replace(/[/\\]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  return safe || 'general';
}

export interface IStorageProvider {
  uploadFile(file: Express.Multer.File, folder: string): Promise<{ id: string; url: string }>;
  deleteFile(fileId: string): Promise<void>;
  getDownloadUrl(fileId: string): Promise<string>;
}

class LocalStorageProvider implements IStorageProvider {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<{ id: string; url: string }> {
    const safeFolder = sanitizeFolder(folder);
    const fileId = uuidv4();
    // Solo extensiones conocidas permitidas
    const rawExt = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.docx', '.doc', '.txt'];
    const extension = allowedExts.includes(rawExt) ? rawExt : '';
    const fileName = `${fileId}${extension}`;
    const folderPath = path.join(this.uploadDir, safeFolder);

    await fsPromises.mkdir(folderPath, { recursive: true });

    const filePath = path.join(folderPath, fileName);
    await fsPromises.writeFile(filePath, file.buffer);

    return {
      id: fileId,
      url: `/uploads/${safeFolder}/${fileName}`
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    // In a real local implementation, we'd need to store the mapping of fileId to path
    // For now, this is a placeholder for the abstraction
    console.log(`Deleting file ${fileId} from local storage`);
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    return `Placeholder URL for ${fileId}`;
  }
}

// Supabase Storage Provider (Placeholder/Prepared)
class SupabaseStorageProvider implements IStorageProvider {
  async uploadFile(file: Express.Multer.File, folder: string): Promise<{ id: string; url: string }> {
    // Aquí se integraría el cliente de Supabase (@supabase/supabase-js)
    console.log('Simulando subida a Supabase Storage...');
    const fileId = uuidv4();
    return {
      id: fileId,
      url: `https://placeholder-project.supabase.co/storage/v1/object/public/documents/${folder}/${fileId}${path.extname(file.originalname)}`
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    console.log(`Eliminando archivo ${fileId} de Supabase Storage`);
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    return `Placeholder URL for Supabase ${fileId}`;
  }
}

// Factoría de Storage
const getStorageProvider = (): IStorageProvider => {
  if (process.env.STORAGE_PROVIDER === 'supabase') {
    return new SupabaseStorageProvider();
  }
  return new LocalStorageProvider();
};

export const StorageService = getStorageProvider();
