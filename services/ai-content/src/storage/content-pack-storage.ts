/**
 * Content Pack Storage
 *
 * Manages persistent storage of generated content packs with indexing and deduplication.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ContentPack } from '../types/content-pack';

export interface ContentPackIndexEntry {
  roundId: string;
  destination: string;
  country: string;
  generatedAt: string;
  verified: boolean;
  antiLeakChecked: boolean;
  filePath: string;
}

export interface ContentPackIndex {
  version: string;
  lastUpdated: string;
  totalPacks: number;
  packs: ContentPackIndexEntry[];
}

export class ContentPackStorage {
  private storageDir: string;
  private indexPath: string;

  constructor(storageDir?: string) {
    // Default to ./data/content-packs (relative to service root)
    // This ensures persistence across restarts (unlike /tmp)
    this.storageDir = storageDir || process.env.CONTENT_PACKS_DIR || './data/content-packs';
    this.indexPath = path.join(this.storageDir, 'content-packs-index.json');

    // Ensure storage directory exists
    this.ensureStorageDirectory();
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      console.log(`[content-pack-storage] Created storage directory: ${this.storageDir}`);
    }
  }

  /**
   * Load the index from disk
   */
  private loadIndex(): ContentPackIndex {
    if (!fs.existsSync(this.indexPath)) {
      return {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        totalPacks: 0,
        packs: [],
      };
    }

    try {
      const content = fs.readFileSync(this.indexPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('[content-pack-storage] Failed to load index, creating new:', error);
      return {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        totalPacks: 0,
        packs: [],
      };
    }
  }

  /**
   * Save the index to disk
   */
  private saveIndex(index: ContentPackIndex): void {
    index.lastUpdated = new Date().toISOString();
    index.totalPacks = index.packs.length;

    try {
      fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
    } catch (error) {
      console.error('[content-pack-storage] Failed to save index:', error);
      throw error;
    }
  }

  /**
   * Save a content pack to storage and update index
   */
  savePack(pack: ContentPack): void {
    const filename = `${pack.roundId}.json`;
    const filepath = path.join(this.storageDir, filename);

    // Save content pack file
    try {
      fs.writeFileSync(filepath, JSON.stringify(pack, null, 2), 'utf-8');
    } catch (error) {
      console.error(`[content-pack-storage] Failed to save pack ${pack.roundId}:`, error);
      throw error;
    }

    // Update index
    const index = this.loadIndex();

    // Check if pack already exists in index (avoid duplicates)
    const existingIndex = index.packs.findIndex(p => p.roundId === pack.roundId);

    const entry: ContentPackIndexEntry = {
      roundId: pack.roundId,
      destination: pack.destination.name,
      country: pack.destination.country,
      generatedAt: pack.metadata.generatedAt,
      verified: pack.metadata.verified,
      antiLeakChecked: pack.metadata.antiLeakChecked,
      filePath: filename,
    };

    if (existingIndex >= 0) {
      // Update existing entry
      index.packs[existingIndex] = entry;
    } else {
      // Add new entry
      index.packs.push(entry);
    }

    this.saveIndex(index);

    console.log(`[content-pack-storage] Saved pack: ${pack.destination.name} (${pack.roundId})`);
  }

  /**
   * Load a content pack by ID
   */
  loadPack(roundId: string): ContentPack | null {
    const index = this.loadIndex();
    const entry = index.packs.find(p => p.roundId === roundId);

    if (!entry) {
      return null;
    }

    const filepath = path.join(this.storageDir, entry.filePath);

    if (!fs.existsSync(filepath)) {
      console.warn(`[content-pack-storage] Pack file not found: ${filepath}`);
      return null;
    }

    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`[content-pack-storage] Failed to load pack ${roundId}:`, error);
      return null;
    }
  }

  /**
   * Check if a destination already exists (case-insensitive)
   * Returns the existing pack ID if found, null otherwise
   */
  findExistingDestination(destinationName: string): string | null {
    const index = this.loadIndex();
    const normalized = destinationName.toLowerCase().trim();

    const existing = index.packs.find(
      p => p.destination.toLowerCase().trim() === normalized
    );

    return existing ? existing.roundId : null;
  }

  /**
   * Get all packs from index (without loading full content)
   */
  getIndex(): ContentPackIndex {
    return this.loadIndex();
  }

  /**
   * Get list of all pack IDs
   */
  getAllPackIds(): string[] {
    const index = this.loadIndex();
    return index.packs.map(p => p.roundId);
  }

  /**
   * Get storage directory path
   */
  getStorageDir(): string {
    return this.storageDir;
  }
}

// Singleton instance
let storageInstance: ContentPackStorage | null = null;

export function getContentPackStorage(): ContentPackStorage {
  if (!storageInstance) {
    storageInstance = new ContentPackStorage();
  }
  return storageInstance;
}
