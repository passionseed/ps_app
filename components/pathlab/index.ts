/**
 * PathLab rich content components — barrel export.
 *
 * These components render the three rich visual storytelling content types
 * that were ported from Hackathon and adapted for PathLab's light theme:
 *
 *  - PathlabComic     → infographic_comic (cinematic panels)
 *  - PathlabWebtoon   → webtoon (long-scroll strip)
 *  - PathlabChatComic → chat_comic (LINE-style messenger)
 */

export { default as PathlabComic } from "./PathlabComic";
export { default as PathlabWebtoon } from "./PathlabWebtoon";
export { default as PathlabChatComic } from "./PathlabChatComic";

// Re-export types for consumers
export type { InfographicComicPanel, PathlabComicProps } from "./PathlabComic";
export type { WebtoonChunk, PathlabWebtoonProps } from "./PathlabWebtoon";
export type { ChatComicMessage, PathlabChatComicProps } from "./PathlabChatComic";
