import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface AudioFile {
  id: string;
  title: string;
  voice: string;
  style: string;
  duration: number;
  timestamp: number;
  blob: Blob;
}

interface MutuDB extends DBSchema {
  audios: {
    key: string;
    value: AudioFile;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'mutu-audio-db';
const DB_VERSION = 1;

class StorageService {
  private dbPromise: Promise<IDBPDatabase<MutuDB>>;

  constructor() {
    this.dbPromise = openDB<MutuDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('audios', { keyPath: 'id' });
        store.createIndex('by-date', 'timestamp');
      },
    });
  }

  async saveAudio(audio: AudioFile): Promise<void> {
    const db = await this.dbPromise;
    await db.put('audios', audio);
  }

  async getAudios(): Promise<AudioFile[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('audios', 'by-date');
  }

  async deleteAudio(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('audios', id);
  }

  async updateAudio(id: string, updates: Partial<AudioFile>): Promise<void> {
    const db = await this.dbPromise;
    const audio = await db.get('audios', id);
    if (audio) {
      const updatedAudio = { ...audio, ...updates };
      await db.put('audios', updatedAudio);
    }
  }

  async renameAudio(id: string, newTitle: string): Promise<void> {
    const db = await this.dbPromise;
    const audio = await db.get('audios', id);
    if (audio) {
      audio.title = newTitle;
      await db.put('audios', audio);
    }
  }

  async getAudio(id: string): Promise<AudioFile | undefined> {
    const db = await this.dbPromise;
    return db.get('audios', id);
  }
}

export const storageService = new StorageService();
