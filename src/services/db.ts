import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GameRecord } from '../types';
import type { MassaParticipant } from '../massa/types';

interface QuizDB extends DBSchema {
  kv: { key: string; value: unknown };
  games: { key: string; value: GameRecord; indexes: { startedAt: number } };
  /** Participantes da Pesquisa Massa FM (dados pessoais, com consentimento). */
  participants: { key: string; value: MassaParticipant; indexes: { eventId: string; createdAt: number } };
}

const DB_NAME = 'conheca-os-cursos-donaduzzi';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<QuizDB> | null> | null = null;

// Se o IndexedDB estiver indisponível (modo anônimo restrito, cota esgotada),
// o jogo continua funcionando com armazenamento em memória.
const memoryKV = new Map<string, unknown>();
const memoryGames = new Map<string, GameRecord>();
const memoryParticipants = new Map<string, MassaParticipant>();

function getDB(): Promise<IDBPDatabase<QuizDB> | null> {
  if (!dbPromise) {
    dbPromise = (async () => {
      if (typeof indexedDB === 'undefined') return null;
      try {
        return await openDB<QuizDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
            if (!db.objectStoreNames.contains('games')) {
              const store = db.createObjectStore('games', { keyPath: 'id' });
              store.createIndex('startedAt', 'startedAt');
            }
            if (!db.objectStoreNames.contains('participants')) {
              const store = db.createObjectStore('participants', { keyPath: 'id' });
              store.createIndex('eventId', 'eventId');
              store.createIndex('createdAt', 'createdAt');
            }
          },
        });
      } catch (err) {
        console.warn('IndexedDB indisponível; usando memória.', err);
        return null;
      }
    })();
  }
  return dbPromise;
}

export async function getKV<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  if (!db) return memoryKV.get(key) as T | undefined;
  try {
    return (await db.get('kv', key)) as T | undefined;
  } catch {
    return memoryKV.get(key) as T | undefined;
  }
}

export async function setKV<T>(key: string, value: T): Promise<void> {
  memoryKV.set(key, value);
  const db = await getDB();
  if (!db) return;
  await db.put('kv', value as unknown, key);
}

export async function deleteKV(key: string): Promise<void> {
  memoryKV.delete(key);
  const db = await getDB();
  if (db) await db.delete('kv', key);
}

export async function putGame(record: GameRecord): Promise<void> {
  memoryGames.set(record.id, record);
  const db = await getDB();
  if (!db) return;
  try {
    await db.put('games', record);
  } catch (err) {
    console.warn('Falha ao salvar partida', err);
  }
}

export async function getAllGames(): Promise<GameRecord[]> {
  const db = await getDB();
  if (!db) return [...memoryGames.values()].sort((a, b) => a.startedAt - b.startedAt);
  return db.getAllFromIndex('games', 'startedAt');
}

export async function clearGames(): Promise<void> {
  memoryGames.clear();
  const db = await getDB();
  if (db) await db.clear('games');
}

// ---------- Participantes da Pesquisa Massa FM ----------
// Diferente das partidas do quiz, aqui uma falha de gravação é propagada: o totem
// precisa saber que não salvou para manter o preenchimento na tela.

export async function putParticipant(p: MassaParticipant): Promise<void> {
  const db = await getDB();
  if (!db) {
    memoryParticipants.set(p.id, p);
    return;
  }
  await db.put('participants', p);
}

export async function getAllParticipants(): Promise<MassaParticipant[]> {
  const db = await getDB();
  if (!db) return [...memoryParticipants.values()].sort((a, b) => a.createdAt - b.createdAt);
  return db.getAllFromIndex('participants', 'createdAt');
}

export async function getParticipantsByEvent(eventId: string): Promise<MassaParticipant[]> {
  const db = await getDB();
  if (!db) return [...memoryParticipants.values()].filter((p) => p.eventId === eventId);
  return db.getAllFromIndex('participants', 'eventId', eventId);
}

export async function deleteParticipant(id: string): Promise<void> {
  memoryParticipants.delete(id);
  const db = await getDB();
  if (db) await db.delete('participants', id);
}

/** Apenas para testes. */
export async function __resetDBForTests(): Promise<void> {
  const db = await getDB();
  if (db) {
    await db.clear('kv');
    await db.clear('games');
    await db.clear('participants');
  }
  memoryKV.clear();
  memoryGames.clear();
  memoryParticipants.clear();
}
