import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Category, Game, Publisher } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** Options for narrowing the game catalog. */
export interface GameFilters {
    /** Category ids; games matching any selected category are returned. */
    categoryIds?: number[];
    /** Publisher id; only games from this publisher are returned. */
    publisherId?: number;
}

/**
 * Return games ordered by title, optionally narrowed by category and publisher.
 *
 * @param db - The writable or in-memory Drizzle database instance.
 * @param filters - Optional category and publisher constraints.
 * @returns Games matching every supplied filter, sorted by title.
 */
export async function getAllGames(
    db: Database,
    filters: GameFilters = {},
): Promise<Game[]> {
    const conditions = [];
    if (filters.categoryIds && filters.categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, filters.categoryIds));
    }
    if (filters.publisherId !== undefined) {
        conditions.push(eq(games.publisherId, filters.publisherId));
    }

    const rows = await baseGamesQuery(db)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Return all categories ordered alphabetically for filter controls.
 *
 * @param db - The writable or in-memory Drizzle database instance.
 * @returns Categories sorted by name.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    return db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
}

/**
 * Return all publishers ordered alphabetically for filter controls.
 *
 * @param db - The writable or in-memory Drizzle database instance.
 * @returns Publishers sorted by name.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}

/**
 * Return all game ids ordered by title.
 *
 * @param db - The writable or in-memory Drizzle database instance.
 * @returns Game ids sorted by their title.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Return a single game by id, or null when it does not exist.
 *
 * @param db - The writable or in-memory Drizzle database instance.
 * @param id - The game id to look up.
 * @returns The matching game or null.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
